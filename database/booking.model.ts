import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IBooking extends Document {
  eventId: Types.ObjectId;
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
      index: true,
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
    const eventExists = await mongoose
      .model('Event')
      .exists({ _id: this.eventId });

    if (!eventExists) {
      throw new Error(`Referenced event does not exist: ${this.eventId}`);
    }
  }
});

// Guard against model re-registration during Next.js hot reloads.
const Booking: Model<IBooking> =
  mongoose.models.Booking ?? mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;
