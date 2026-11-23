using BugTrack.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BugTrack.Data.Configurations;

public sealed class TicketEventConfiguration : EntityConfiguration<TicketEvent>
{
    protected override void ConfigureEntity(EntityTypeBuilder<TicketEvent> b)
    {
        b.ToTable("TicketEvents");
        b.Property(e => e.Type).HasConversion<string>().HasMaxLength(32);
        b.Property(e => e.Note).HasMaxLength(2048);

        b.HasOne(e => e.Ticket).WithMany().HasForeignKey("TicketId").IsRequired().OnDelete(DeleteBehavior.Cascade);
        b.HasOne(e => e.Actor).WithMany().HasForeignKey("ActorId").IsRequired().OnDelete(DeleteBehavior.Restrict);
    }
}
