using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace API.DTOs;

public class RegisterDto : IValidatableObject
{
    private const int MinPhotos = 2;
    private const int MaxPhotos = 8;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string DisplayName { get; set; } = "";

    [Required]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; set; } = "";

    [Required]
    [StringLength(64, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$",
        ErrorMessage = "Password must include uppercase, lowercase, and a number")]
    public string Password { get; set; } = "";

    [Required]
    [RegularExpression("(?i)^(male|female|other)$", ErrorMessage = "Gender must be male, female, or other")]
    public string Gender { get; set; } = string.Empty;
    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string City { get; set; } = string.Empty;
    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string Country { get; set; } = string.Empty;
    [Required] public DateOnly DateOfBirth { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }

    public List<IFormFile> Photos { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (DateOfBirth == default)
        {
            yield return new ValidationResult(
                "Date of birth is required",
                [nameof(DateOfBirth)]);
            yield break;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var latestAllowedBirthDate = today.AddYears(-18);
        var earliestAllowedBirthDate = today.AddYears(-120);

        if (DateOfBirth > latestAllowedBirthDate)
        {
            yield return new ValidationResult(
                "You must be at least 18 years old",
                [nameof(DateOfBirth)]);
        }

        if (DateOfBirth < earliestAllowedBirthDate)
        {
            yield return new ValidationResult(
                "Enter a realistic date of birth",
                [nameof(DateOfBirth)]);
        }

        if (Photos.Count < MinPhotos || Photos.Count > MaxPhotos)
        {
            yield return new ValidationResult(
                $"Registration requires between {MinPhotos} and {MaxPhotos} photos",
                [nameof(Photos)]);
        }

        foreach (var photo in Photos)
        {
            if (photo.Length == 0)
            {
                yield return new ValidationResult(
                    "Uploaded photos cannot be empty",
                    [nameof(Photos)]);
            }

            if (!photo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                yield return new ValidationResult(
                    "Uploaded photos must be image files",
                    [nameof(Photos)]);
            }
        }
    }
}
