import { config } from 'dotenv'
import { MongoClient } from 'mongodb'

config({ path: '.env.local' })

let uri = process.env.MONGODB_URI
if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set')
  process.exit(1)
}

if (!uri.includes('/clin')) {
  uri = uri.endsWith('/') ? uri + 'clin' : uri + '/clin'
}

console.log('🔗 Connecting to MongoDB')
const client = new MongoClient(uri)

async function optimizeNotificationCollection() {
  try {
    console.log('🔧 Starting Notification collection optimization...')
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db('clin')
    const collection = db.collection('Notification')
    
    const notificationCount = await collection.countDocuments()
    console.log(`📊 Found ${notificationCount} notifications in collection`)
    
    console.log('🏗️ Creating optimized compound indexes...')
    const indexResults = await createNotificationIndexes(collection)
    
    console.log('🧪 Testing index performance...')
    const performanceResults = await testNotificationIndexPerformance(collection)
    
    console.log('📈 Analyzing notification data patterns...')
    const dataAnalysis = await analyzeNotificationData(collection)
    
    console.log('\n🎉 Notification collection optimization completed!')
    console.log('📋 Summary:')
    console.log(`   - Indexes Created: ${indexResults.length}`)
    console.log(`   - Performance Tests: ${performanceResults.length}`)
    console.log(`   - Total Notifications: ${dataAnalysis.totalDocuments}`)
    
    return {
      success: true,
      indexes: indexResults,
      performance: performanceResults,
      dataAnalysis
    }
    
  } catch (error) {
    console.error('❌ Error optimizing Notification collection:', error)
    throw error
  } finally {
    await client.close()
    console.log('🔐 Database connection closed')
  }
}

async function createNotificationIndexes(collection) {
  const indexes = [
    {
      name: 'patientId_isRead_createdAt_idx',
      spec: { patientId: 1, isRead: 1, createdAt: -1 },
      description: 'Optimizes unread notification queries with date sorting (primary use case)'
    },
    {
      name: 'patientId_createdAt_idx', 
      spec: { patientId: 1, createdAt: -1 },
      description: 'Optimizes general notification listing with newest-first sorting'
    },
    {
      name: 'patientId_type_idx',
      spec: { patientId: 1, type: 1, createdAt: -1 },
      description: 'Optimizes notification filtering by type (info, success, warning, error)'
    },
    {
      name: 'patientId_simple_idx',
      spec: { patientId: 1 },
      description: 'Simple index for count queries and basic patient notification lookups'
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
      console.log(`   ✅ ${index.name} - ${index.description}`)
    } catch (error) {
      if (error.code === 85) {
        results.push({
          name: index.name,
          status: 'exists',
          description: index.description
        })
        console.log(`   ℹ️ ${index.name} - Already exists`)
      } else {
        console.log(`   ❌ ${index.name} - Error: ${error.message}`)
      }
    }
  }
  
  return results
}

async function testNotificationIndexPerformance(collection) {
  const tests = []
  
  try {
    // Test 1: Get unread notifications for a patient (most common query)
    const test1Start = Date.now()
    const result1 = await collection.find(
      { 
        patientId: { $exists: true },
        isRead: false 
      },
      { 
        projection: { 
          patientId: 1, message: 1, title: 1, 
          type: 1, isRead: 1, createdAt: 1 
        } 
      }
    ).sort({ createdAt: -1 }).limit(20).toArray()
    const test1Time = Date.now() - test1Start
    
    tests.push({
      testName: 'Unread Notifications Query',
      executionTime: test1Time,
      resultCount: result1.length
    })
    
    // Test 2: Get all notifications for a patient (general listing)
    const test2Start = Date.now()
    const result2 = await collection.find(
      { patientId: { $exists: true } },
      { 
        projection: { 
          patientId: 1, message: 1, title: 1, 
          type: 1, isRead: 1, createdAt: 1 
        } 
      }
    ).sort({ createdAt: -1 }).limit(20).toArray()
    const test2Time = Date.now() - test2Start
    
    tests.push({
      testName: 'General Notifications Listing',
      executionTime: test2Time,
      resultCount: result2.length
    })
    
    // Test 3: Count unread notifications (for badge)
    const test3Start = Date.now()
    const result3 = await collection.countDocuments({
      patientId: { $exists: true },
      isRead: false
    })
    const test3Time = Date.now() - test3Start
    
    tests.push({
      testName: 'Unread Count Query (Badge)',
      executionTime: test3Time,
      resultCount: result3
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

async function analyzeNotificationData(collection) {
  try {
    const totalDocuments = await collection.countDocuments()
    
    const typeDistribution = await collection.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray()
    
    const readStatusDistribution = await collection.aggregate([
      {
        $group: {
          _id: '$isRead',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    const analysis = {
      totalDocuments,
      typeDistribution,
      readStatusDistribution
    }
    
    console.log('   📈 Data analysis completed:')
    console.log(`      Total notifications: ${totalDocuments}`)
    console.log(`      Type distribution:`, typeDistribution.map(t => `${t._id || 'unknown'}: ${t.count}`).join(', '))
    console.log(`      Read status:`, readStatusDistribution.map(s => `${s._id ? 'read' : 'unread'}: ${s.count}`).join(', '))
    
    return analysis
    
  } catch (error) {
    console.error('   ❌ Error during data analysis:', error.message)
    return { error: error.message }
  }
}

optimizeNotificationCollection()
  .then(result => {
    console.log('\n🎯 Optimization Summary:')
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Optimization failed:', error)
    process.exit(1)
  })