using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class ReleaseConfiguration : EntityConfiguration<Release>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Release> b)
    {
        b.ToTable("Releases");
        b.Property(r => r.Version).IsRequired().HasMaxLength(100);
        b.HasIndex(r => r.Version).IsUnique();
    }
}
