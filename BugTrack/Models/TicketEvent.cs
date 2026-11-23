using BugTrack.Models.Enums;

namespace BugTrack.Models;

public class TicketEvent : Entity
{
    private TicketEvent() { } // EF Core

    public TicketEvent(Ticket ticket, User actor, TicketEventType type, string? note)
    {
        Ticket = ticket ?? throw new ArgumentNullException(nameof(ticket));
        Actor = actor ?? throw new ArgumentNullException(nameof(actor));
        Guard.DefinedEnum(type, "Неизвестный тип события");
        Type = type;
        Note = note;
        OccurredAt = DateTime.UtcNow;
    }

    public Ticket Ticket { get; private set; } = null!;
    public User Actor { get; private set; } = null!;
    public TicketEventType Type { get; private set; }
    public string? Note { get; private set; }
    public DateTime OccurredAt { get; private set; }
}
