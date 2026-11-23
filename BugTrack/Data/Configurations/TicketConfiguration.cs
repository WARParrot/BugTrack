using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class TicketConfiguration : EntityConfiguration<Ticket>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Ticket> b)
    {
        b.ToTable("Tickets");
        b.Property(t => t.Title).IsRequired().HasMaxLength(200);
        b.Property(t => t.Description).IsRequired();
        b.Property(t => t.StepsToReproduce).IsRequired();
        b.Property(t => t.Status).HasConversion<string>().HasMaxLength(32);
        b.Property(t => t.Priority).HasConversion<string>().HasMaxLength(16);
        b.Property(t => t.MergeRequestUrl).HasMaxLength(2048);

        // Optimistic concurrency: UPDATE ... WHERE Id = @id AND Revision = @original.
        b.Property(t => t.Revision).IsConcurrencyToken();

        b.HasOne(t => t.Project).WithMany().HasForeignKey("ProjectId").IsRequired().OnDelete(DeleteBehavior.Restrict);
        b.HasOne(t => t.Reporter).WithMany().HasForeignKey("ReporterId").IsRequired().OnDelete(DeleteBehavior.Restrict);
        b.HasOne(t => t.Assignee).WithMany().HasForeignKey("AssigneeId").IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(t => t.Release).WithMany().HasForeignKey("ReleaseId").IsRequired(false).OnDelete(DeleteBehavior.Restrict);

        // «value object» Deadline lives in the Tickets table (column DeadlineAt, NULL = no deadline).
        b.OwnsOne(t => t.Deadline, d => d.Property(x => x.DueAt).HasColumnName("DeadlineAt"));
    }
}
