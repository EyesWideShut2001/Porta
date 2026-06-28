using API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260614174500_EnsureMinimumMemberPhotos")]
    public partial class EnsureMinimumMemberPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO Photos (Url, PublicId, DisplayOrder, MemberId)
                SELECT
                    'https://picsum.photos/seed/' || m.Id || '-1/600/600',
                    NULL,
                    COALESCE((SELECT MAX(p.DisplayOrder) + 1 FROM Photos p WHERE p.MemberId = m.Id), 0),
                    m.Id
                FROM Members m
                WHERE (SELECT COUNT(*) FROM Photos p WHERE p.MemberId = m.Id) = 0;
                """);

            migrationBuilder.Sql("""
                INSERT INTO Photos (Url, PublicId, DisplayOrder, MemberId)
                SELECT
                    'https://picsum.photos/seed/' || m.Id || '-2/600/600',
                    NULL,
                    COALESCE((SELECT MAX(p.DisplayOrder) + 1 FROM Photos p WHERE p.MemberId = m.Id), 0),
                    m.Id
                FROM Members m
                WHERE (SELECT COUNT(*) FROM Photos p WHERE p.MemberId = m.Id) = 1;
                """);

            migrationBuilder.Sql("""
                UPDATE Members
                SET ImageUrl = (
                    SELECT p.Url
                    FROM Photos p
                    WHERE p.MemberId = Members.Id
                    ORDER BY p.DisplayOrder, p.Id
                    LIMIT 1
                )
                WHERE ImageUrl IS NULL
                  AND EXISTS (SELECT 1 FROM Photos p WHERE p.MemberId = Members.Id);
                """);

            migrationBuilder.Sql("""
                UPDATE AspNetUsers
                SET ImageUrl = (
                    SELECT m.ImageUrl
                    FROM Members m
                    WHERE m.Id = AspNetUsers.Id
                )
                WHERE ImageUrl IS NULL
                  AND EXISTS (SELECT 1 FROM Members m WHERE m.Id = AspNetUsers.Id);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM Photos
                WHERE PublicId IS NULL
                  AND Url LIKE 'https://picsum.photos/seed/%/600/600';
                """);
        }
    }
}
