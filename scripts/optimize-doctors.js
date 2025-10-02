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

async function optimizeDoctorsCollection() {
  try {
    console.log('🔧 Starting doctors collection optimization...')
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db('clin')
    const collection = db.collection('doctors')
    
    const doctorCount = await collection.countDocuments()
    console.log(`📊 Found ${doctorCount} doctors in collection`)
    
    console.log('🏗️ Creating optimized compound indexes...')
    const indexResults = await createDoctorIndexes(collection)
    
    console.log('🧪 Testing index performance...')
    const performanceResults = await testDoctorIndexPerformance(collection)
    
    console.log('📈 Analyzing doctor data patterns...')
    const dataAnalysis = await analyzeDoctorData(collection)
    
    console.log('\n🎉 Doctors collection optimization completed!')
    console.log('📋 Summary:')
    console.log(`   - Indexes Created: ${indexResults.length}`)
    console.log(`   - Performance Tests: ${performanceResults.length}`)
    console.log(`   - Total Doctors: ${dataAnalysis.totalDocuments}`)
    
    return {
      success: true,
      indexes: indexResults,
      performance: performanceResults,
      dataAnalysis
    }
    
  } catch (error) {
    console.error('❌ Error optimizing doctors collection:', error)
    throw error
  } finally {
    await client.close()
    console.log('🔐 Database connection closed')
  }
}

async function createDoctorIndexes(collection) {
  const indexes = [
    {
      name: 'name_specialty_status_idx',
      spec: { name: 1, specialty: 1, status: 1 },
      description: 'Optimizes name + specialty + status searches for doctor cards'
    },
    {
      name: 'specialty_status_name_idx', 
      spec: { specialty: 1, status: 1, name: 1 },
      description: 'Optimizes specialty filtering with status and name sorting'
    },
    {
      name: 'status_name_idx',
      spec: { status: 1, name: 1 },
      description: 'Optimizes general doctor listing by status with name sorting'
    },
    {
      name: 'doctor_fee_discount_idx',
      spec: { doctor_fee: 1, Discount: 1, status: 1 },
      description: 'Optimizes price-based sorting and filtering'
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

async function testDoctorIndexPerformance(collection) {
  const tests = []
  
  try {
    const test1Start = Date.now()
    const result1 = await collection.find(
      { status: { $ne: 'inactive' } },
      { 
        projection: { 
          name: 1, doctor_fee: 1, Discount: 1, 
          photoUrl: 1, specialty: 1, address: 1 
        } 
      }
    ).sort({ name: 1 }).limit(12).toArray()
    const test1Time = Date.now() - test1Start
    
    tests.push({
      testName: 'General Doctor Listing (Card View)',
      executionTime: test1Time,
      resultCount: result1.length
    })
    
    const test2Start = Date.now()
    const result2 = await collection.find(
      { 
        specialty: { $regex: 'Cardio', $options: 'i' },
        status: { $ne: 'inactive' }
      },
      { 
        projection: { 
          name: 1, doctor_fee: 1, Discount: 1, 
          photoUrl: 1, specialty: 1, address: 1 
        } 
      }
    ).sort({ name: 1 }).toArray()
    const test2Time = Date.now() - test2Start
    
    tests.push({
      testName: 'Specialty Search (Cardiology)',
      executionTime: test2Time,
      resultCount: result2.length
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

async function analyzeDoctorData(collection) {
  try {
    const totalDocuments = await collection.countDocuments()
    
    const specialtyAggregation = await collection.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$specialty', '$specialization'] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray()
    
    const analysis = {
      totalDocuments,
      specialtyDistribution: specialtyAggregation
    }
    
    console.log('   📈 Data analysis completed:')
    console.log(`      Total doctors: ${totalDocuments}`)
    console.log(`      Top specialties:`, specialtyAggregation.slice(0, 3).map(s => `${s._id}: ${s.count}`).join(', '))
    
    return analysis
    
  } catch (error) {
    console.error('   ❌ Error during data analysis:', error.message)
    return { error: error.message }
  }
}

optimizeDoctorsCollection()
  .then(result => {
    console.log('\n🎯 Optimization Summary:')
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Optimization failed:', error)
    process.exit(1)
  })