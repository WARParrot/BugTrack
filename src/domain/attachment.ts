import { Entity, ensure } from "./entity.js";
import { User } from "./user.js";
export const attachmentTypes = ["LOG", "SCREENSHOT", "DOCUMENT"] as const;
export type AttachmentType = (typeof attachmentTypes)[number];
export class Attachment extends Entity {
  readonly url: string;
  readonly uploadedAt: string;
  constructor(
    readonly uploader: User,
    readonly type: AttachmentType,
    url: string,
  ) {
    super();
    ensure(attachmentTypes.includes(type), "Неизвестный тип вложения");
    this.url = url.trim();
    this.uploadedAt = new Date().toISOString();
    let valid = false;
    try {
      const parsed = new URL(this.url);
      valid =
        ["http:", "https:"].includes(parsed.protocol) &&
        !!parsed.hostname &&
        !parsed.username &&
        !parsed.password;
    } catch {}
    ensure(
      valid && this.url.length <= 2048,
      "Укажите HTTP(S) URL вложения без пароля",
    );
  }
  getType(): AttachmentType {
    return this.type;
  }
  getUrl(): string {
    return this.url;
  }
}
