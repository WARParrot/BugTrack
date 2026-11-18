import { Entity, text } from "./entity.js";
import { User } from "./user.js";
export class Comment extends Entity {
  readonly text: string;
  private readonly _replies: Comment[] = [];
  get replies(): readonly Comment[] {
    return [...this._replies];
  }
  private _parent: Comment | null = null;
  readonly createdAt: string;
  constructor(
    readonly author: User,
    content: string,
  ) {
    super();
    this.text = text(content, "Комментарий", 5000);
    this.createdAt = new Date().toISOString();
  }
  getAuthor(): User {
    return this.author;
  }
  getText(): string {
    return this.text;
  }
  getReplies(): Comment[] {
    return [...this.replies];
  }
  restoreReplies(replies: Comment[]): void {
    this._replies.splice(0, this._replies.length, ...replies);
  }

  getParent(): Comment | null {
    return this._parent;
  }
  addReply(author: User, content: string): Comment {
    const reply = new Comment(author, content);
    reply._parent = this;
    this._replies.push(reply);
    return reply;
  }
}
