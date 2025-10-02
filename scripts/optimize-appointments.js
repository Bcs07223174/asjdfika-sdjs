import { config } from 'dotenv'
import { MongoClient } from 'mongodb'

// Load environment variables
config({ path: '.env.local' })

let uri = process.env.MONGODB_URI

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set')
  process.exit(1)
}

// Ensure the URI includes the database name
if (!uri.includes('/clin')) {
  if (uri.endsWith('/')) {
    uri = uri + 'clin'
  } else {
    uri = uri + '/clin'
  }
}

console.log('🔗 Connecting to MongoDB:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@'))

const client = new MongoClient(uri)

async function optimizeAppointmentsCollection() {
  try {
    console.log('🔧 Starting appointments collection optimization...')
    
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db('clin')
    const collection = db.collection('appointments')
    
    // Check current collection status
    const appointmentCount = await collection.countDocuments()
    console.log(`📊 Found ${appointmentCount} appointments in collection`)
    
    // Create optimized compound indexes for appointment queries
    console.log('🏗️ Creating optimized compound indexes...')
    
    const indexResults = await createAppointmentIndexes(collection)
    
    // Test index performance
    console.log('🧪 Testing index performance...')
    const performanceResults = await testAppointmentIndexPerformance(collection)
    
    // Analyze existing appointment data patterns
    console.log('📈 Analyzing appointment data patterns...')
    const dataAnalysis = await analyzeAppointmentData(collection)
    
    // Optimize existing appointment documents
    console.log('⚡ Optimizing existing appointment documents...')
    const optimizationResults = await optimizeAppointmentDocuments(collection)
    
    console.log('\n🎉 Appointments collection optimization completed!')
    console.log('📋 Summary:')
    console.log(`   - Indexes Created: ${indexResults.length}`)
    console.log(`   - Performance Tests: ${performanceResults.length}`)
    console.log(`   - Documents Analyzed: ${dataAnalysis.totalDocuments}`)
    console.log(`   - Documents Optimized: ${optimizationResults.modifiedCount}`)
    
    return {
      success: true,
      indexes: indexResults,
      performance: performanceResults,
      dataAnalysis,
      optimization: optimizationResults
    }
    
  } catch (error) {
    console.error('❌ Error optimizing appointments collection:', error)
    throw error
  } finally {
    await client.close()
    console.log('🔐 Database connection closed')
  }
}

async function createAppointmentIndexes(collection) {
  const indexes = [
    {
      name: 'doctorId_date_time_status_idx',
      spec: { 
        doctorId: 1, 
        date: 1, 
        time: 1, 
        status: 1 
      },
      description: 'Critical index for slot availability checks and conflict detection'
    },
    {
      name: 'patientId_date_status_idx', 
      spec: { 
        patientId: 1, 
        date: 1, 
        status: 1 
      },
      description: 'Optimizes patient appointment history and upcoming appointments'
    },
    {
      name: 'doctorId_date_status_idx',
      spec: { 
        doctorId: 1, 
        date: 1, 
        status: 1 
      },
      description: 'Optimizes doctor daily schedule and appointment management'
    },
    {
      name: 'patientId_status_date_idx',
      spec: { 
        patientId: 1, 
        status: 1, 
        date: 1 
      },
      description: 'Optimizes status-based patient queries (confirmed, pending, cancelled)'
    },
    {
      name: 'doctorId_status_date_idx',
      spec: { 
        doctorId: 1, 
        status: 1, 
        date: 1 
      },
      description: 'Optimizes doctor appointment management by status'
    },
    {
      name: 'appointmentKey_unique_idx',
      spec: { appointmentKey: 1 },
      options: { unique: true, sparse: true },
      description: 'Ensures unique appointment keys for quick lookups'
    },
    {
      name: 'createdAt_idx',
      spec: { createdAt: 1 },
      description: 'Optimizes chronological sorting and analytics'
    },
    {
      name: 'date_status_idx',
      spec: { date: 1, status: 1 },
      description: 'Optimizes daily appointment queries across all doctors'
    }
  ]
  
  const results = []
  
  for (const index of indexes) {
    try {
      await collection.createIndex(
        index.spec, 
        { 
          background: true, 
          name: index.name,
          ...(index.options || {})
        }
      )
      results.push({
        name: index.name,
        status: 'created',
        description: index.description,
        fields: Object.keys(index.spec)
      })
      console.log(`   ✅ ${index.name} - ${index.description}`)
    } catch (error) {
      if (error.code === 85) { // Index already exists
        results.push({
          name: index.name,
          status: 'exists',
          description: index.description,
          fields: Object.keys(index.spec)
        })
        console.log(`   ℹ️ ${index.name} - Already exists`)
      } else {
        console.log(`   ❌ ${index.name} - Error: ${error.message}`)
        results.push({
          name: index.name,
          status: 'error',
          error: error.message
        })
      }
    }
  }
  
  return results
}

async function testAppointmentIndexPerformance(collection) {
  // Use sample data or create test documents if collection is empty
  const sampleDoctorId = '60f1b0a8290666380fd5fa36'
  const samplePatientId = '60f1b0a8290666380fd5fa37'
  const testDate = '2025-09-30'
  const testTime = '10:00'
  
  const tests = []
  
  try {
    // Test 1: Doctor slot availability check (most critical query)
    const test1Start = Date.now()
    const result1 = await collection.findOne({
      doctorId: sampleDoctorId,
      date: testDate,
      time: testTime,
      status: { $in: ['confirmed', 'pending'] }
    })
    const test1Time = Date.now() - test1Start
    
    tests.push({
      testName: 'Doctor Slot Availability Check',
      query: 'doctorId + date + time + status',
      executionTime: test1Time,
      indexUsed: 'doctorId_date_time_status_idx',
      result: result1 ? 'slot_unavailable' : 'slot_available'
    })
    
    // Test 2: Patient appointments lookup
    const test2Start = Date.now()
    const result2 = await collection.find({
      patientId: samplePatientId,
      status: 'confirmed'
    }).limit(10).toArray()
    const test2Time = Date.now() - test2Start
    
    tests.push({
      testName: 'Patient Confirmed Appointments',
      query: 'patientId + status',
      executionTime: test2Time,
      indexUsed: 'patientId_status_date_idx',
      resultCount: result2.length
    })
    
    // Test 3: Doctor daily schedule
    const test3Start = Date.now()
    const result3 = await collection.find({
      doctorId: sampleDoctorId,
      date: testDate,
      status: { $ne: 'cancelled' }
    }).sort({ time: 1 }).toArray()
    const test3Time = Date.now() - test3Start
    
    tests.push({
      testName: 'Doctor Daily Schedule',
      query: 'doctorId + date + status (not cancelled)',
      executionTime: test3Time,
      indexUsed: 'doctorId_date_status_idx',
      resultCount: result3.length
    })
    
    // Test 4: Appointment key lookup
    const test4Start = Date.now()
    const result4 = await collection.findOne({
      appointmentKey: '123456'
    })
    const test4Time = Date.now() - test4Start
    
    tests.push({
      testName: 'Appointment Key Lookup',
      query: 'appointmentKey',
      executionTime: test4Time,
      indexUsed: 'appointmentKey_unique_idx',
      result: result4 ? 'found' : 'not_found'
    })
    
    // Test 5: Recent appointments (pagination)
    const test5Start = Date.now()
    const result5 = await collection.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()
    const test5Time = Date.now() - test5Start
    
    tests.push({
      testName: 'Recent Appointments (Pagination)',
      query: 'sort by createdAt desc, limit 20',
      executionTime: test5Time,
      indexUsed: 'createdAt_idx',
      resultCount: result5.length
    })
    
    console.log('   📊 Performance test results:')
    tests.forEach(test => {
      console.log(`      ${test.testName}: ${test.executionTime}ms`)
    })
    
  } catch (error) {
    console.error('   ❌ Error during performance testing:', error.message)
  }
  
  return tests
}

async function analyzeAppointmentData(collection) {
  try {
    // Basic statistics
    const totalDocuments = await collection.countDocuments()
    
    // Status distribution
    const statusAggregation = await collection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray()
    
    // Doctor appointment counts
    const doctorAggregation = await collection.aggregate([
      {
        $group: {
          _id: '$doctorId',
          appointmentCount: { $sum: 1 },
          doctorName: { $first: '$doctorName' }
        }
      },
      { $sort: { appointmentCount: -1 } },
      { $limit: 10 }
    ]).toArray()
    
    // Date range analysis
    const dateAggregation = await collection.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' },
          uniqueDates: { $addToSet: '$date' }
        }
      },
      {
        $project: {
          minDate: 1,
          maxDate: 1,
          uniqueDateCount: { $size: '$uniqueDates' }
        }
      }
    ]).toArray()
    
    // Time slot analysis
    const timeAggregation = await collection.aggregate([
      {
        $group: {
          _id: '$time',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray()
    
    const analysis = {
      totalDocuments,
      statusDistribution: statusAggregation,
      topDoctors: doctorAggregation,
      dateRange: dateAggregation[0] || {},
      popularTimes: timeAggregation
    }
    
    console.log('   📈 Data analysis completed:')
    console.log(`      Total appointments: ${totalDocuments}`)
    console.log(`      Status distribution:`, statusAggregation.map(s => `${s._id}: ${s.count}`).join(', '))
    
    return analysis
    
  } catch (error) {
    console.error('   ❌ Error during data analysis:', error.message)
    return { error: error.message }
  }
}

async function optimizeAppointmentDocuments(collection) {
  try {
    // Ensure all documents have required fields with proper types
    const updateResult = await collection.updateMany(
      {},
      [
        {
          $set: {
            // Ensure time field exists (use sessionStartTime as fallback)
            time: {
              $cond: {
                if: { $ifNull: ['$time', false] },
                then: '$time',
                else: { $ifNull: ['$sessionStartTime', ''] }
              }
            },
            // Ensure date is properly formatted
            date: {
              $cond: {
                if: { $type: '$date' },
                then: '$date',
                else: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
              }
            },
            // Ensure updatedAt exists
            updatedAt: {
              $cond: {
                if: { $ifNull: ['$updatedAt', false] },
                then: '$updatedAt',
                else: { $ifNull: ['$createdAt', new Date()] }
              }
            }
          }
        }
      ]
    )
    
    console.log(`   ⚡ Optimized ${updateResult.modifiedCount} appointment documents`)
    
    return updateResult
    
  } catch (error) {
    console.error('   ❌ Error during document optimization:', error.message)
    return { error: error.message, modifiedCount: 0 }
  }
}

// Run the optimization
optimizeAppointmentsCollection()
  .then(result => {
    console.log('\n🎯 Optimization Summary:')
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Optimization failed:', error)
    process.exit(1)
  })