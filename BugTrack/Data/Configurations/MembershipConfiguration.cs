using BugTrack.Models;
using BugTrack.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class MembershipConfiguration : EntityConfiguration<Membership>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Membership> b)
    {
        b.ToTable("Memberships");
        b.Property(m => m.Role).HasConversion<string>().HasMaxLength(32);

        b.HasOne(m => m.Project)
            .WithMany(p => p.Members)
            .HasForeignKey("ProjectId")
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(m => m.User)
            .WithMany()
            .HasForeignKey("UserId")
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex("ProjectId", "UserId").IsUnique();
    }
}
