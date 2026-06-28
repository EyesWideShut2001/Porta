using Microsoft.AspNetCore.Http;

namespace API.DTOs;

public class MemberPhotoUpdateDto
{
    public List<string> PhotoOrder { get; set; } = [];
    public List<IFormFile> NewPhotos { get; set; } = [];
}
