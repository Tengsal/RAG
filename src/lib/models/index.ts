import { Model, Schema, model, models } from "mongoose";

type MessageSource = {
  id: number;
  documentId: number;
  documentName: string;
  pageNumber: number;
  lineStart?: number | null;
  lineEnd?: number | null;
  snippet: string;
  retrievalScore: number;
};

export interface ConversationRecord {
  id: number;
  title: string;
  categoryId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecord {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  confidence: "high" | "medium" | "low" | null;
  sources: MessageSource[] | null;
  followUpQuestions: string[] | null;
  clarificationOptions: string[] | null;
  createdAt: Date;
}

export interface CategoryRecord { id: number; name: string; icon: string; description: string | null; }
export interface DocumentRecord { id: number; categoryId: number | null; title: string; description: string | null; pageCount: number | null; createdAt: Date; }
export interface BookmarkRecord { id: number; conversationId: number; createdAt: Date; }
export interface NoticeRecord { id: number; title: string; content: string; priority: "normal" | "high" | "urgent"; isPinned: boolean; categoryId: number | null; deadline: string | null; publishedAt: Date; createdAt: Date; }

const options = { versionKey: false };

const conversationSchema = new Schema<ConversationRecord>({
  id: { type: Number, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  categoryId: { type: Number, default: null },
}, { ...options, timestamps: true });

const messageSchema = new Schema<MessageRecord>({
  id: { type: Number, required: true, unique: true, index: true },
  conversationId: { type: Number, required: true, index: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  confidence: { type: String, enum: ["high", "medium", "low"], default: null },
  sources: { type: [Schema.Types.Mixed], default: null },
  followUpQuestions: { type: [String], default: null },
  clarificationOptions: { type: [String], default: null },
  createdAt: { type: Date, default: Date.now },
}, options);

const categorySchema = new Schema<CategoryRecord>({
  id: { type: Number, required: true, unique: true, index: true }, name: { type: String, required: true }, icon: { type: String, required: true }, description: { type: String, default: null },
}, options);
const documentSchema = new Schema<DocumentRecord>({
  id: { type: Number, required: true, unique: true, index: true }, categoryId: { type: Number, default: null }, title: { type: String, required: true }, description: { type: String, default: null }, pageCount: { type: Number, default: null }, createdAt: { type: Date, default: Date.now },
}, options);
const bookmarkSchema = new Schema<BookmarkRecord>({
  id: { type: Number, required: true, unique: true, index: true }, conversationId: { type: Number, required: true, index: true }, createdAt: { type: Date, default: Date.now },
}, options);
const noticeSchema = new Schema<NoticeRecord>({
  id: { type: Number, required: true, unique: true, index: true }, title: { type: String, required: true }, content: { type: String, required: true }, priority: { type: String, enum: ["normal", "high", "urgent"], default: "normal" }, isPinned: { type: Boolean, default: false }, categoryId: { type: Number, default: null }, deadline: { type: String, default: null }, publishedAt: { type: Date, default: Date.now }, createdAt: { type: Date, default: Date.now },
}, options);

const counterSchema = new Schema<{ _id: string; value: number }>({ _id: String, value: { type: Number, required: true, default: 0 } }, options);

function getModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (models[name] as Model<T> | undefined) ?? model<T>(name, schema);
}

export const Conversation = getModel("Conversation", conversationSchema);
export const Message = getModel("Message", messageSchema);
export const Category = getModel("Category", categorySchema);
export const KnowledgeDocument = getModel("KnowledgeDocument", documentSchema);
export const Bookmark = getModel("Bookmark", bookmarkSchema);
export const Notice = getModel("Notice", noticeSchema);
const Counter = getModel("Counter", counterSchema);

export async function nextId(collection: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    collection,
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return counter!.value;
}
