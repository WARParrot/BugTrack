using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class UserConfiguration : EntityConfiguration<User>
{
    protected override void ConfigureEntity(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users");
        b.Property(u => u.FullName).IsRequired().HasMaxLength(100);
        b.Property(u => u.Email).HasConversion(e => e.Value, v => new Email(v)).IsRequired().HasMaxLength(254);
        b.HasIndex(u => u.Email).IsUnique();
        b.Property(u => u.PasswordHash).IsRequired().HasMaxLength(512);
    }
}
