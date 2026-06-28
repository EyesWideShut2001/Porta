using System.Reflection;
using System.Security.Claims;
using API.Data;
using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Helpers;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;


namespace API.Controllers
{
    [Authorize]
    public class MembersController(IUnitOfWork uow, IPhotoService photoService) : BaseApiController
    {
        private const int MinPhotos = 2;
        private const int MaxPhotos = 8;

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<Member>>> GetMembers([FromQuery] MemberParams memberParams)
        {
            memberParams.CurrentMemberId = User.GetMemberId();
            return Ok(await uow.MemberRepository.GetMembersAsync(memberParams));
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<Member>> GetMember(string id) //localhost:5001/api/members/bob-id
        {
            var member = await uow.MemberRepository.GetMemberByIdAsync(id);
            if (member == null) return NotFound();
            return member;
        }

        [HttpGet("{id}/photos")]
        public async Task<ActionResult<IReadOnlyList<Photo>>> GetMemberPhotos(string id)
        {
            return Ok(await uow.MemberRepository.GetPhotosForMemberAsync(id));
        }

        [HttpPut]
        public async Task<ActionResult> UpdateMember(MemberUpdateDto memberUpdateDto)
        {
            var memberId = User.GetMemberId();

            var member = await uow.MemberRepository.GetMemberForUpdate(memberId);

            if (member == null) return BadRequest("Could not get member!");

            member.DisplayName = memberUpdateDto.DisplayName ?? member.DisplayName;
            member.Description = memberUpdateDto.Description ?? member.Description;
            member.City = memberUpdateDto.City ?? member.City;
            member.Country = memberUpdateDto.Country ?? member.Country;

            member.User.DisplayName = memberUpdateDto.DisplayName ?? member.User.DisplayName;

            uow.MemberRepository.Update(member); //optional

            if (await uow.Complete()) return NoContent();

            return BadRequest("Failed to update member!");

        }

        [HttpPost("add-photo")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<Photo>> AddPhoto([FromForm] IFormFile? file)
        {
            if (file == null || file.Length == 0) return BadRequest("Select a photo to upload");

            if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Uploaded file must be an image");
            }

            var member = await uow.MemberRepository.GetMemberForUpdate(User.GetMemberId());

            if (member == null) return BadRequest("Cannot update member!");

            if (member.Photos.Count >= MaxPhotos)
            {
                return BadRequest($"You can upload up to {MaxPhotos} photos");
            }

            var result = await photoService.UploadPhotoAsync(file);

            if (result.Error != null) return BadRequest(result.Error.Message);

            var photo = new Photo
            {
                Url = result.SecureUrl.AbsoluteUri,
                PublicId = result.PublicId,
                MemberId = User.GetMemberId(),
                DisplayOrder = member.Photos.Count == 0
                    ? 0
                    : member.Photos.Max(x => x.DisplayOrder) + 1
            };

            if (member.ImageUrl == null)
            {
                member.ImageUrl = photo.Url;
                member.User.ImageUrl = photo.Url;
            }

            member.Photos.Add(photo);

            if (await uow.Complete()) return photo;

            return BadRequest("Problem adding photo!");
        }

        [HttpPut("photos")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<IReadOnlyList<Photo>>> UpdatePhotos([FromForm] MemberPhotoUpdateDto photoUpdateDto)
        {
            var member = await uow.MemberRepository.GetMemberForUpdate(User.GetMemberId());

            if (member == null) return BadRequest("Cannot update member!");

            if (photoUpdateDto.PhotoOrder.Count < MinPhotos || photoUpdateDto.PhotoOrder.Count > MaxPhotos)
            {
                return BadRequest($"You must keep between {MinPhotos} and {MaxPhotos} photos");
            }

            var existingPhotosById = member.Photos.ToDictionary(x => x.Id);
            var parsedPhotoOrder = new List<PhotoOrderItem>();
            var submittedExistingPhotoIds = new HashSet<int>();
            var submittedNewPhotoIndexes = new HashSet<int>();

            foreach (var photoKey in photoUpdateDto.PhotoOrder)
            {
                var photoOrderItem = ParsePhotoOrderItem(photoKey);

                if (photoOrderItem == null)
                {
                    return BadRequest("Photo order contains an invalid photo reference");
                }

                if (photoOrderItem.ExistingPhotoId is int existingPhotoId)
                {
                    if (!existingPhotosById.ContainsKey(existingPhotoId))
                    {
                        return BadRequest("Photo order includes a photo that does not belong to the current user");
                    }

                    if (!submittedExistingPhotoIds.Add(existingPhotoId))
                    {
                        return BadRequest("Photo order contains duplicate existing photos");
                    }
                }

                if (photoOrderItem.NewPhotoIndex is int newPhotoIndex)
                {
                    if (newPhotoIndex < 0 || newPhotoIndex >= photoUpdateDto.NewPhotos.Count)
                    {
                        return BadRequest("Photo order includes an invalid uploaded photo");
                    }

                    if (!submittedNewPhotoIndexes.Add(newPhotoIndex))
                    {
                        return BadRequest("Photo order contains duplicate uploaded photos");
                    }
                }

                parsedPhotoOrder.Add(photoOrderItem);
            }

            if (submittedNewPhotoIndexes.Count != photoUpdateDto.NewPhotos.Count)
            {
                return BadRequest("Every uploaded photo must be included in the photo order");
            }

            foreach (var file in photoUpdateDto.NewPhotos)
            {
                if (file.Length == 0) return BadRequest("Uploaded photos cannot be empty");

                if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Uploaded photos must be image files");
                }
            }

            var photosToDelete = member.Photos
                .Where(x => !submittedExistingPhotoIds.Contains(x.Id))
                .ToList();

            var uploadedPhotosByIndex = new Dictionary<int, Photo>();

            foreach (var newPhotoIndex in submittedNewPhotoIndexes.Order())
            {
                var file = photoUpdateDto.NewPhotos[newPhotoIndex];
                var result = await photoService.UploadPhotoAsync(file);

                if (result.Error != null)
                {
                    await DeleteUploadedPhotos(uploadedPhotosByIndex.Values);
                    return BadRequest(result.Error.Message);
                }

                if (result.SecureUrl == null)
                {
                    await DeleteUploadedPhotos(uploadedPhotosByIndex.Values);
                    return BadRequest("Problem uploading photo");
                }

                uploadedPhotosByIndex[newPhotoIndex] = new Photo
                {
                    Url = result.SecureUrl.AbsoluteUri,
                    PublicId = result.PublicId,
                    MemberId = member.Id
                };
            }

            foreach (var photo in photosToDelete)
            {
                member.Photos.Remove(photo);
            }

            foreach (var photo in uploadedPhotosByIndex.Values)
            {
                member.Photos.Add(photo);
            }

            var orderedPhotos = parsedPhotoOrder
                .Select(photoOrderItem => photoOrderItem.ExistingPhotoId is int existingPhotoId
                    ? existingPhotosById[existingPhotoId]
                    : uploadedPhotosByIndex[photoOrderItem.NewPhotoIndex!.Value])
                .ToList();

            for (var index = 0; index < orderedPhotos.Count; index++)
            {
                orderedPhotos[index].DisplayOrder = index;
            }

            SyncPrimaryPhoto(member);

            if (await uow.Complete())
            {
                await DeleteUploadedPhotos(photosToDelete);

                return Ok(GetOrderedPhotos(member).ToList());
            }

            await DeleteUploadedPhotos(uploadedPhotosByIndex.Values);

            return BadRequest("Problem updating photos");
        }

        [HttpPut("reorder-photos")]
        public async Task<ActionResult> ReorderPhotos(PhotoOrderDto photoOrderDto)
        {
            var member = await uow.MemberRepository.GetMemberForUpdate(User.GetMemberId());

            if (member == null) return BadRequest("Cannot get member from token");

            if (photoOrderDto.PhotoIds.Count != member.Photos.Count)
            {
                return BadRequest("Photo order must include all current photos");
            }

            var submittedPhotoIds = photoOrderDto.PhotoIds.ToHashSet();
            if (submittedPhotoIds.Count != member.Photos.Count || member.Photos.Any(x => !submittedPhotoIds.Contains(x.Id)))
            {
                return BadRequest("Photo order includes invalid photos");
            }

            for (var index = 0; index < photoOrderDto.PhotoIds.Count; index++)
            {
                var photo = member.Photos.Single(x => x.Id == photoOrderDto.PhotoIds[index]);
                photo.DisplayOrder = index;
            }

            SyncPrimaryPhoto(member);

            if (await uow.Complete()) return NoContent();

            return BadRequest("Problem reordering photos");
        }

        [HttpDelete("delete-photo/{photoId}")]
        public async Task<ActionResult> DeletePhoto(int photoId)
        {
            var member = await uow.MemberRepository.GetMemberForUpdate(User.GetMemberId());

            if (member == null) return BadRequest("Cannot get member from token");

            var photo = member.Photos.SingleOrDefault(x => x.Id == photoId);

            if (photo == null)
            {
                return BadRequest("This photo cannot be deleted!");
            }

            if (member.Photos.Count <= MinPhotos)
            {
                return BadRequest($"You must keep at least {MinPhotos} photos");
            }

            if (photo.PublicId != null)
            {
                var result = await photoService.DeletePhotoAsync(photo.PublicId);
                if (result.Error != null) return BadRequest(result.Error.Message);

            }

            member.Photos.Remove(photo);
            ResequencePhotos(member);
            SyncPrimaryPhoto(member);

            if (await uow.Complete()) return Ok();
            return BadRequest("Problem deleting the photo!");

        }

        private static void ResequencePhotos(Member member)
        {
            var orderedPhotos = GetOrderedPhotos(member).ToList();

            for (var index = 0; index < orderedPhotos.Count; index++)
            {
                orderedPhotos[index].DisplayOrder = index;
            }
        }

        private static void SyncPrimaryPhoto(Member member)
        {
            var firstPhoto = GetOrderedPhotos(member).FirstOrDefault();

            member.ImageUrl = firstPhoto?.Url;
            member.User.ImageUrl = firstPhoto?.Url;
        }

        private static IOrderedEnumerable<Photo> GetOrderedPhotos(Member member)
        {
            return member.Photos
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Id);
        }

        private static PhotoOrderItem? ParsePhotoOrderItem(string value)
        {
            if (value.StartsWith("existing:", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value["existing:".Length..], out var existingPhotoId))
            {
                return new PhotoOrderItem(existingPhotoId, null);
            }

            if (value.StartsWith("new:", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value["new:".Length..], out var newPhotoIndex))
            {
                return new PhotoOrderItem(null, newPhotoIndex);
            }

            return null;
        }

        private async Task DeleteUploadedPhotos(IEnumerable<Photo> photos)
        {
            foreach (var photo in photos)
            {
                if (photo.PublicId == null) continue;

                await photoService.DeletePhotoAsync(photo.PublicId);
            }
        }

        private sealed record PhotoOrderItem(int? ExistingPhotoId, int? NewPhotoIndex);



    }
}
