using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class SourceRepositoryConfiguration : EntityConfiguration<SourceRepository>
{
    protected override void ConfigureEntity(EntityTypeBuilder<SourceRepository> b)
    {
        b.ToTable("SourceRepositories");
        b.Property(r => r.Name).IsRequired().HasMaxLength(150);
        b.Property(r => r.Url).IsRequired().HasMaxLength(2048);

        b.HasOne<Project>()
            .WithOne(p => p.Repository)
            .HasForeignKey<SourceRepository>("ProjectId")
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);
    }
}
