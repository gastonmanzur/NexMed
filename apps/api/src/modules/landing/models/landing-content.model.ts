import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const mediaSchema = new mongoose.Schema({ url: String, type: { type: String, enum: ['image', 'video'] }, posterUrl: String, alt: String }, { _id: false });
const ctaSchema = new mongoose.Schema({ label: String, href: String, visible: { type: Boolean, default: true } }, { _id: false });
const visibleSchema = new mongoose.Schema({ visible: { type: Boolean, default: true } }, { _id: false });

const landingStateSchema = new mongoose.Schema({
  seo: { metaTitle: String, metaDescription: String, ogImageUrl: String },
  hero: { ...visibleSchema.obj, eyebrow: String, title: String, subtitle: String, supportingText: String, media: mediaSchema, ctas: { demo: ctaSchema, whatsapp: ctaSchema, login: ctaSchema, register: ctaSchema }, whatsapp: { number: String, message: String } },
  features: [{ ...visibleSchema.obj, icon: String, title: String, description: String }],
  problemSolution: { ...visibleSchema.obj, title: String, subtitle: String, text: String, cards: [{ ...visibleSchema.obj, title: String, description: String }] },
  howItWorks: { ...visibleSchema.obj, title: String, subtitle: String, steps: [{ ...visibleSchema.obj, title: String, description: String, icon: String }] },
  benefits: { ...visibleSchema.obj, centerTitle: String, centerItems: [String], patientTitle: String, patientItems: [String] },
  modules: { ...visibleSchema.obj, title: String, subtitle: String, cards: [{ ...visibleSchema.obj, title: String, description: String, media: mediaSchema }] },
  testimonials: [{ ...visibleSchema.obj, name: String, role: String, text: String, photoUrl: String }],
  faq: [{ ...visibleSchema.obj, question: String, answer: String, order: Number }],
  finalCta: { ...visibleSchema.obj, title: String, subtitle: String, ctas: { demo: ctaSchema, whatsapp: ctaSchema, login: ctaSchema, register: ctaSchema } },
  footer: { ...visibleSchema.obj, brandText: String, contactText: String, links: [{ label: String, href: String, visible: { type: Boolean, default: true } }] }
}, { _id: false });

const landingContentSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'main' },
  draft: { type: landingStateSchema, required: true },
  published: { type: landingStateSchema, required: true },
  publishedAt: Date
}, { timestamps: true });

export type LandingContentDocument = InferSchemaType<typeof landingContentSchema> & { _id: mongoose.Types.ObjectId };
export const LandingContentModel: Model<LandingContentDocument> = mongoose.model<LandingContentDocument>('LandingContent', landingContentSchema);
