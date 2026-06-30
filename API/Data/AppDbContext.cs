using System;
using Microsoft.EntityFrameworkCore;
using API.Entities;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using API.Helpers;


namespace API.Data;

public class AppDbContext(DbContextOptions options) : IdentityDbContext<AppUser>(options)
{

    public DbSet<Member> Members { get; set; }
    public DbSet<Photo> Photos { get; set; }
    public DbSet<MemberLike> Likes { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Group> Groups { get; set; }
    public DbSet<Connection> Connections { get; set; }
    public DbSet<Interest> Interests { get; set; }

    //public DbSet <Sport> Sports { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<IdentityRole>()
                .HasData(
                        new IdentityRole { Id = "member-id", Name = "Member", NormalizedName = "MEMBER" },
                        new IdentityRole { Id = "moderator-id", Name = "Moderator", NormalizedName = "MODERATOR" },
                        new IdentityRole { Id = "admin-id", Name = "Admin", NormalizedName = "ADMIN" }
                );

        modelBuilder.Entity<Message>()
                .HasOne(x => x.Recipient)
                .WithMany(m => m.MessagesReceived)
                .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Message>()
                .HasOne(x => x.Sender)
                .WithMany(m => m.MessagesSent)
                .OnDelete(DeleteBehavior.Restrict);


        modelBuilder.Entity<MemberLike>()
                .HasKey(x => new { x.SourceMemberId, x.TargetMemberId });

        modelBuilder.Entity<MemberLike>()
                .HasOne(s => s.SourceMember)
                .WithMany(t => t.LikedMembers)
                .HasForeignKey(s => s.SourceMemberId)
                .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MemberLike>()
                .HasOne(s => s.TargetMember)
                .WithMany(t => t.LikedByMembers)
                .HasForeignKey(s => s.TargetMemberId)
                .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Member>()
                .HasMany(x => x.Interests)
                .WithMany(x => x.Members)
                .UsingEntity<Dictionary<string, object>>(
                        "MemberInterests",
                        right => right
                                .HasOne<Interest>()
                                .WithMany()
                                .HasForeignKey("InterestId")
                                .OnDelete(DeleteBehavior.Cascade),
                        left => left
                                .HasOne<Member>()
                                .WithMany()
                                .HasForeignKey("MemberId")
                                .OnDelete(DeleteBehavior.Cascade),
                        join => join.HasKey("MemberId", "InterestId")
                );

        modelBuilder.Entity<Interest>()
                .HasData(InterestCatalog.All.Select(x => new Interest { Id = x.Id, Name = x.Name }));



        var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
                v => v.ToUniversalTime(),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc)
        );

        var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
                v => v.HasValue ? v.Value.ToUniversalTime() : null,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null
        );

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(dateTimeConverter);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(nullableDateTimeConverter);
                }
            }
        }
    }

}
