import { MongoClient } from "mongodb"

const URI = process.env.MONGODB_URI || "mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/"
const DATABASE_NAME = process.env.DATABASE_NAME || "clin"

let client: MongoClient | null = null

export async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
  }

  try {
    await client.connect()
    return client.db(DATABASE_NAME)
  } catch (error) {
    console.error("Database connection error:", error)
    throw error
  }
}

export async function closeConnection() {
  if (client) {
    await client.close()
    client = null
  }
}
