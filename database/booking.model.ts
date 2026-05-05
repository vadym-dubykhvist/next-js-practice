import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IBooking extends Document {
  eventId: Types.ObjectId;
  slug: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// RFC 5322-inspired pattern: sufficient for application-level validation.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bookingSchema = new Schema<IBooking>(
  {
    // Indexed for efficient lookups of all bookings belonging to an event.
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => EMAIL_REGEX.test(value),
        message: 'Invalid email address',
      },
    },
  },
  { timestamps: true }
);

// Confirm the referenced event exists before allowing the booking to persist.
// Mongoose 9: pre-save receives (opts: SaveOptions) — no next callback.
// Must be async because it awaits a DB existence check.
bookingSchema.pre('save', async function () {
  if (this.isNew || this.isModified('eventId')) {
    try {
      const eventExists = await mongoose
        .model('Event')
        .exists({ _id: this.eventId });

      if (!eventExists) {
        throw new Error(`Referenced event does not exist: ${this.eventId}`);
      }
    } catch {
      const validationError = new Error('Invalid events ID format or database error');
      validationError.name = 'ValidationError';
      throw validationError;
    }
  }
});

// Create index on eventId for faster queries
bookingSchema.index({ eventId: 1 });

// Create compound index for common queries (events bookings by date)
bookingSchema.index({ eventId: 1, createdAt: -1 });

// Create index on email for user booking lookups
bookingSchema.index({ email: 1 });

// Enforce one booking per events per email
bookingSchema.index({ eventId: 1, email: 1 }, { unique: true, name: 'uniq_event_email' });

// Guard against model re-registration during Next.js hot reloads.
const Booking: Model<IBooking> =
  mongoose.models.Booking ?? mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;
