#!/usr/bin/env node

/**
 * Database Optimization Runner
 * 
 * This script optimizes the MongoDB collection for doctor schedules
 * by creating compound indexes and optimizing existing data.
 * 
 * Usage:
 *   node scripts/optimize-database.js
 *   or
 *   pnpm run db:optimize
 */

import { config } from 'dotenv'
import { MongoClient } from 'mongodb'

// Load environment variables
config()

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DATABASE_NAME = process.env.DATABASE_NAME || 'clin'

async function optimizeDatabase() {
  let client

  try {
    console.log('🚀 Starting database optimization...')
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db(DATABASE_NAME)
    const collection = db.collection('doctor_schedules')
    
    // 1. Analyze current state
    console.log('\n📊 Analyzing current collection state...')
    const analysis = await analyzeCollection(collection)
    console.log('Analysis results:', analysis)
    
    // 2. Create optimized indexes
    console.log('\n🔧 Creating optimized indexes...')
    const indexResults = await createOptimizedIndexes(collection)
    console.log('Index creation results:', indexResults)
    
    // 3. Test index performance
    console.log('\n⚡ Testing index performance...')
    const performanceResults = await testIndexPerformance(collection)
    console.log('Performance test results:', performanceResults)
    
    // 4. Optimize existing data
    console.log('\n🔄 Optimizing existing data...')
    const optimizationResults = await optimizeExistingData(collection)
    console.log('Data optimization results:', optimizationResults)
    
    console.log('\n✅ Database optimization completed successfully!')
    
    // Summary
    console.log('\n📋 OPTIMIZATION SUMMARY:')
    console.log(`- Total documents: ${analysis.totalDocuments}`)
    console.log(`- Indexes created: ${indexResults.filter(r => r.status === 'created').length}`)
    console.log(`- Documents optimized: ${optimizationResults.documentsOptimized}`)
    console.log('\n🎯 RECOMMENDATIONS:')
    console.log('- Use the new optimized APIs: /api/slots/optimized and /api/schedule-optimized/[doctorId]')
    console.log('- Consider implementing Redis caching for frequently accessed schedules')
    console.log('- Pre-calculate time slots during schedule creation for best performance')
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('🔌 Database connection closed')
    }
  }
}

async function analyzeCollection(collection) {
  const totalDocs = await collection.countDocuments()
  
  // Count different types of schedules
  const weekSpecific = await collection.countDocuments({
    weekStart: { $exists: true },
    weekEnd: { $exists: true }
  })
  
  const general = await collection.countDocuments({
    weekStart: { $exists: false },
    weekEnd: { $exists: false }
  })
  
  // Count unique doctors
  const uniqueDoctors = await collection.distinct('doctorId')
  
  // Check for pre-calculated slots
  const withPreCalculatedSlots = await collection.countDocuments({
    $or: [
      { 'days.morningSlots': { $exists: true } },
      { 'days.eveningSlots': { $exists: true } }
    ]
  })
  
  return {
    totalDocuments: totalDocs,
    weekSpecificSchedules: weekSpecific,
    generalSchedules: general,
    uniqueDoctors: uniqueDoctors.length,
    withPreCalculatedSlots
  }
}

async function createOptimizedIndexes(collection) {
  const indexes = [
    {
      name: 'doctorId_dayOfWeek_idx',
      spec: { doctorId: 1, 'days.dayOfWeek': 1 },
      description: 'Optimizes queries for doctor + specific day'
    },
    {
      name: 'doctorId_dateRange_idx',
      spec: { doctorId: 1, weekStart: 1, weekEnd: 1 },
      description: 'Optimizes date range queries'
    },
    {
      name: 'doctorId_general_idx',
      spec: { doctorId: 1, weekStart: 1 },
      description: 'Optimizes general schedule queries'
    }
  ]
  
  const results = []
  
  for (const index of indexes) {
    try {
      await collection.createIndex(index.spec, { 
        background: true, 
        name: index.name 
      })
      results.push({
        name: index.name,
        status: 'created',
        description: index.description
      })
      console.log(`  ✅ Created index: ${index.name}`)
    } catch (error) {
      if (error.message.includes('already exists')) {
        results.push({
          name: index.name,
          status: 'exists',
          description: index.description
        })
        console.log(`  ℹ️  Index already exists: ${index.name}`)
      } else {
        results.push({
          name: index.name,
          status: 'error',
          error: error.message
        })
        console.log(`  ❌ Error creating index ${index.name}: ${error.message}`)
      }
    }
  }
  
  return results
}

async function testIndexPerformance(collection) {
  // Find a sample doctor ID for testing
  const sampleDoc = await collection.findOne({})
  if (!sampleDoc) {
    return { error: 'No documents found for performance testing' }
  }
  
  const testDoctorId = sampleDoc.doctorId
  const testDate = new Date('2025-09-15')
  const testDayOfWeek = 'Monday'
  
  const tests = []
  
  // Test 1: Doctor + Day query
  try {
    const start = Date.now()
    const result = await collection.findOne({
      doctorId: testDoctorId,
      'days.dayOfWeek': testDayOfWeek
    })
    const duration = Date.now() - start
    
    tests.push({
      name: 'Doctor + DayOfWeek Query',
      duration: `${duration}ms`,
      found: !!result
    })
  } catch (error) {
    tests.push({
      name: 'Doctor + DayOfWeek Query',
      error: error.message
    })
  }
  
  // Test 2: Date range query
  try {
    const start = Date.now()
    const result = await collection.findOne({
      doctorId: testDoctorId,
      weekStart: { $lte: testDate },
      weekEnd: { $gte: testDate }
    })
    const duration = Date.now() - start
    
    tests.push({
      name: 'Doctor + Date Range Query',
      duration: `${duration}ms`,
      found: !!result
    })
  } catch (error) {
    tests.push({
      name: 'Doctor + Date Range Query',
      error: error.message
    })
  }
  
  return tests
}

async function optimizeExistingData(collection) {
  // Find documents without pre-calculated slots
  const unoptimizedDocs = await collection.find({
    $or: [
      { 'days.morningSlots': { $exists: false } },
      { 'days.eveningSlots': { $exists: false } }
    ]
  }).limit(100).toArray()
  
  let optimizedCount = 0
  
  for (const doc of unoptimizedDocs) {
    if (doc.days && Array.isArray(doc.days)) {
      const optimizedDays = doc.days.map(day => {
        // Generate morning slots if missing
        if (!day.morningSlots && day.morningStart && day.morningEnd && !day.isOffDay) {
          day.morningSlots = generateTimeSlots(
            day.morningStart, 
            day.morningEnd, 
            parseInt(day.slotduration || '30')
          )
        }
        
        // Generate evening slots if missing
        if (!day.eveningSlots && day.eveningStart && day.eveningEnd && !day.isOffDay) {
          day.eveningSlots = generateTimeSlots(
            day.eveningStart, 
            day.eveningEnd, 
            parseInt(day.slotduration || '30')
          )
        }
        
        return day
      })
      
      await collection.updateOne(
        { _id: doc._id },
        { 
          $set: { 
            days: optimizedDays,
            lastOptimized: new Date()
          }
        }
      )
      
      optimizedCount++
      console.log(`  📝 Optimized document ${doc._id}`)
    }
  }
  
  return {
    documentsOptimized: optimizedCount,
    totalFound: unoptimizedDocs.length
  }
}

function generateTimeSlots(startTime, endTime, durationMinutes) {
  const slots = []
  const start = new Date(`2000-01-01T${startTime}:00`)
  const end = new Date(`2000-01-01T${endTime}:00`)
  
  let current = new Date(start)
  
  while (current < end) {
    slots.push(current.toTimeString().slice(0, 5))
    current.setMinutes(current.getMinutes() + durationMinutes)
  }
  
  return slots
}

// Run the optimization
optimizeDatabase()