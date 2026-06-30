using System;
using API.DTOs;
using API.Data;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

public class AccountController(
    UserManager<AppUser> userManager,
    ITokenService tokenService,
    IPhotoService photoService,
    IWebHostEnvironment env,
    AppDbContext context) : BaseApiController
{

    [HttpPost("register")]  // api/account/register
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UserDto>> Register([FromForm] RegisterDto registerDto)
    {
        var email = registerDto.Email.Trim();
        var displayName = registerDto.DisplayName.Trim();
        var city = registerDto.City.Trim();
        var country = registerDto.Country.Trim();
        var description = string.IsNullOrWhiteSpace(registerDto.Description)
            ? null
            : registerDto.Description.Trim();
        var interestIds = registerDto.InterestIds.Distinct().ToList();
        var interests = await context.Interests
            .Where(x => interestIds.Contains(x.Id))
            .ToListAsync();

        if (interests.Count != interestIds.Count)
        {
            ModelState.AddModelError(nameof(RegisterDto.InterestIds), "One or more interests are invalid");
            return ValidationProblem();
        }

        var uploadedPhotos = new List<Photo>();

        foreach (var file in registerDto.Photos)
        {
            var uploadResult = await photoService.UploadPhotoAsync(file);

            if (uploadResult.Error != null)
            {
                await DeleteUploadedPhotos(uploadedPhotos);
                ModelState.AddModelError(nameof(RegisterDto.Photos), uploadResult.Error.Message);
                return ValidationProblem();
            }

            if (uploadResult.SecureUrl == null)
            {
                await DeleteUploadedPhotos(uploadedPhotos);
                ModelState.AddModelError(nameof(RegisterDto.Photos), "Problem uploading photo");
                return ValidationProblem();
            }

            uploadedPhotos.Add(new Photo
            {
                Url = uploadResult.SecureUrl.AbsoluteUri,
                PublicId = uploadResult.PublicId,
                DisplayOrder = uploadedPhotos.Count
            });
        }

        var user = new AppUser
        {
            DisplayName = displayName,
            Email = email,
            UserName = email,
            ImageUrl = uploadedPhotos[0].Url,
            Member = new Member
            {
                DisplayName = displayName,
                Gender = registerDto.Gender.Trim().ToLowerInvariant(),
                City = city,
                Country = country,
                DateOfBirth = registerDto.DateOfBirth,
                Description = description,
                ImageUrl = uploadedPhotos[0].Url,
                Photos = uploadedPhotos,
                Interests = interests
            }
        };

        var result = await userManager.CreateAsync(user, registerDto.Password);

        if (!result.Succeeded)
        {
            await DeleteUploadedPhotos(uploadedPhotos);
            AddIdentityErrorsToModelState(result.Errors);

            return ValidationProblem();
        }

        var roleResult = await userManager.AddToRoleAsync(user, "Member");

        if (!roleResult.Succeeded)
        {
            await userManager.DeleteAsync(user);
            await DeleteUploadedPhotos(uploadedPhotos);
            AddIdentityErrorsToModelState(roleResult.Errors);

            return ValidationProblem();
        }

        await SetRefreshTokenCookie(user);

        return await user.ToDto(tokenService);
    }


    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
    {
        var user = await userManager.FindByEmailAsync(loginDto.Email);

        if (user == null)
            return Unauthorized("Invalid email address! ");

        var result = await userManager.CheckPasswordAsync(user, loginDto.Password);

        if (!result) return Unauthorized("Invalid password");

        await SetRefreshTokenCookie(user);


        return await user.ToDto(tokenService);
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<UserDto>> RefreshToken()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (refreshToken == null) return NoContent();

        var user = await userManager.Users
            .FirstOrDefaultAsync(x => x.RefreshToken == refreshToken && x.RefreshTokenExpiry > DateTime.UtcNow);

        if (user == null) return Unauthorized();

        await SetRefreshTokenCookie(user);

        return await user.ToDto(tokenService);

    }

    private async Task SetRefreshTokenCookie(AppUser user)
    {
        var refreshToken = tokenService.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await userManager.UpdateAsync(user);

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = !env.IsDevelopment(),
            SameSite = env.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(7)
        };

        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await userManager.Users
            .Where(x => x.Id == User.GetMemberId())
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.RefreshToken, _ => null)
                                                  .SetProperty(x => x.RefreshTokenExpiry, _ => null));
        Response.Cookies.Delete("refreshToken");
        return Ok();
    }

    private void AddIdentityErrorsToModelState(IEnumerable<IdentityError> errors)
    {
        foreach (var error in errors)
        {
            ModelState.AddModelError("identity", error.Description);
        }
    }

    private async Task DeleteUploadedPhotos(IEnumerable<Photo> photos)
    {
        foreach (var photo in photos)
        {
            if (photo.PublicId == null) continue;

            await photoService.DeletePhotoAsync(photo.PublicId);
        }
    }

}
