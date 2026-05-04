import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    // Populated automatically via pre-save hook; not set by the caller.
    slug: { type: String, unique: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    // Stored as YYYY-MM-DD after normalization.
    date: { type: String, required: true },
    // Stored as HH:MM (24-hour) after normalization.
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'agenda must contain at least one item',
      },
    },
    organizer: { type: String, required: true, trim: true },
    tags: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'tags must contain at least one item',
      },
    },
  },
  { timestamps: true }
);

// Converts a title into a URL-safe slug, e.g. "Hello World!" → "hello-world"
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Accepts any date string parseable by Date and returns YYYY-MM-DD.
function normalizeDate(raw: string): string {
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: "${raw}"`);
  }
  return parsed.toISOString().split('T')[0];
}

// Accepts "H:MM", "HH:MM", or "H:MM AM/PM" and returns zero-padded HH:MM (24-hour).
function normalizeTime(raw: string): string {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) throw new Error(`Invalid time value: "${raw}"`);

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (meridiem === 'PM' && hours !== 12) hours += 12;

  if (hours > 23 || parseInt(minutes, 10) > 59) {
    throw new Error(`Time out of range: "${raw}"`);
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

// Mongoose 9: pre-save receives (opts: SaveOptions) — no next callback.
// Errors thrown here are caught and forwarded by Mongoose automatically.
eventSchema.pre('save', function () {
  // Re-generate slug only when the title is new or has changed.
  if (this.isModified('title')) {
    this.slug = toSlug(this.title);
  }

  if (this.isModified('date')) {
    this.date = normalizeDate(this.date);
  }

  if (this.isModified('time')) {
    this.time = normalizeTime(this.time);
  }
});

// Guard against model re-registration during Next.js hot reloads.
const Event: Model<IEvent> =
  mongoose.models.Event ?? mongoose.model<IEvent>('Event', eventSchema);

export default Event;
