using API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260630110000_MemberInterests")]
    public partial class MemberInterests : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Interests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Interests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MemberInterests",
                columns: table => new
                {
                    MemberId = table.Column<string>(type: "TEXT", nullable: false),
                    InterestId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberInterests", x => new { x.MemberId, x.InterestId });
                    table.ForeignKey(
                        name: "FK_MemberInterests_Interests_InterestId",
                        column: x => x.InterestId,
                        principalTable: "Interests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MemberInterests_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                INSERT INTO Interests (Id, Name) VALUES
                    (1, 'Hiking'), (2, 'Camping'), (3, 'Travel'), (4, 'Road Trips'),
                    (5, 'Nature'), (6, 'Beach'), (7, 'Gardening'), (8, 'Pets'),
                    (9, 'Volunteering'), (10, 'Meditation'), (11, 'Running'), (12, 'Gym'),
                    (13, 'Yoga'), (14, 'Cycling'), (15, 'Swimming'), (16, 'Football'),
                    (17, 'Basketball'), (18, 'Tennis'), (19, 'Skiing'), (20, 'Dancing'),
                    (21, 'Reading'), (22, 'Writing'), (23, 'Photography'), (24, 'Movies'),
                    (25, 'TV Series'), (26, 'Music'), (27, 'Concerts'), (28, 'Theatre'),
                    (29, 'Museums'), (30, 'Podcasts'), (31, 'Cooking'), (32, 'Baking'),
                    (33, 'Coffee'), (34, 'Restaurants'), (35, 'Board Games'), (36, 'Art'),
                    (37, 'Fashion'), (38, 'Gaming'), (39, 'Technology'), (40, 'DIY Projects');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_MemberInterests_InterestId",
                table: "MemberInterests",
                column: "InterestId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "MemberInterests");
            migrationBuilder.DropTable(name: "Interests");
        }
    }
}
