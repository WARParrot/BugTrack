using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class ProjectConfiguration : EntityConfiguration<Project>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Project> b)
    {
        b.ToTable("Projects");
        b.Property(p => p.Name).IsRequired().HasMaxLength(150);
        b.Property(p => p.Description).IsRequired();
    }
}
