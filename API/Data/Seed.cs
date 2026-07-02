using System;
using System.Text.Json;
using API.DTOs;
using API.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class Seed
{
    public static async Task SeedUsers(UserManager<AppUser> userManager, AppDbContext context)
    {
        if (await userManager.Users.AnyAsync()) return;

        var memberData = await File.ReadAllTextAsync("Data/UserSeedData.json");
        var members = JsonSerializer.Deserialize<List<SeedUserDto>>(memberData);

        if (members is not { Count: > 0 })
        {
            throw new InvalidDataException("No users were found in the seed data file");
        }

        var interests = await context.Interests.OrderBy(x => x.Id).ToListAsync();

        foreach (var member in members)
        {
            var photoUrls = member.ImageUrls
                .Select(x => x.Trim())
                .Where(x => x.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (photoUrls.Count != member.ImageUrls.Count || photoUrls.Count is < 2 or > 8)
            {
                throw new InvalidDataException(
                    $"Seed user '{member.Email}' must have between 2 and 8 unique image URLs");
            }

            var interestIds = member.InterestIds.Distinct().ToList();
            if (interestIds.Count == 0 || interestIds.Count != member.InterestIds.Count)
            {
                throw new InvalidDataException(
                    $"Seed user '{member.Email}' must have at least one interest and no duplicates");
            }

            var memberInterests = interests
                .Where(x => interestIds.Contains(x.Id))
                .ToList();

            if (memberInterests.Count != interestIds.Count)
            {
                var invalidInterestIds = interestIds.Except(memberInterests.Select(x => x.Id));
                throw new InvalidDataException(
                    $"Seed user '{member.Email}' has invalid interest IDs: {string.Join(", ", invalidInterestIds)}");
            }

            var primaryImageUrl = photoUrls[0];

            var user = new AppUser
            {
                Id = member.Id,
                Email = member.Email,
                UserName = member.Email,
                DisplayName = member.DisplayName,
                ImageUrl = primaryImageUrl,
                Member = new Member
                {
                    Id = member.Id,
                    DisplayName = member.DisplayName,
                    Description = member.Description,
                    DateOfBirth = member.DateOfBirth,
                    ImageUrl = primaryImageUrl,
                    Gender = member.Gender,
                    City = member.City,
                    Country = member.Country,
                    LastActive = member.LastActive,
                    Created = member.Created,
                    Interests = memberInterests,
                    Photos = photoUrls
                        .Select((url, index) => new Photo
                        {
                            Url = url,
                            MemberId = member.Id,
                            DisplayOrder = index
                        })
                        .ToList()
                }
            };

            var result = await userManager.CreateAsync(user, "Pa$$w0rd");

            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not create seed user '{member.Email}': " +
                    string.Join(", ", result.Errors.Select(x => x.Description)));
            }

            var roleResult = await userManager.AddToRoleAsync(user, "Member");
            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not assign the Member role to seed user '{member.Email}': " +
                    string.Join(", ", roleResult.Errors.Select(x => x.Description)));
            }
        }

    }

    public static async Task CleanupLegacyAdministration(
        UserManager<AppUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        var seededAdmin = await userManager.FindByEmailAsync("admin@test.com");
        if (seededAdmin != null)
        {
            await userManager.DeleteAsync(seededAdmin);
        }

        foreach (var roleName in new[] { "Admin", "Moderator" })
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role == null) continue;

            var users = await userManager.GetUsersInRoleAsync(roleName);
            foreach (var user in users)
            {
                await userManager.RemoveFromRoleAsync(user, roleName);
            }

            await roleManager.DeleteAsync(role);
        }
    }
}
