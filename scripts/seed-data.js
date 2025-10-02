const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://Hussianahmad6666:Hussainahmad6666@cluster0.pdlqy3m.mongodb.net/";
const client = new MongoClient(uri);

async function seedDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db("clin");
    
    // Clear existing data (optional)
    console.log("Clearing existing data...");
    await db.collection("users").deleteMany({});
    await db.collection("appointments").deleteMany({});
    await db.collection("doctor_schedules").deleteMany({});
    
    // Sample Doctors
    const doctors = [
      {
        _id: new ObjectId(),
        name: "Dr. Sarah Johnson",
        email: "dr.sarah@cliniccare.com",
        phone: "+923001234567",
        role: "doctor",
        doctor_fee: "500",
        Discount: "15",
        passwordHash: "$2a$10$example.hash.here",
        photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
        specialty: "Cardiologist",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Dr. Ahmed Khan",
        email: "dr.ahmed@cliniccare.com",
        phone: "+923001234568",
        role: "doctor",
        doctor_fee: "400",
        Discount: "10",
        passwordHash: "$2a$10$example.hash.here",
        photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
        specialty: "General Physician",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Dr. Maria Rodriguez",
        email: "dr.maria@cliniccare.com",
        phone: "+923001234569",
        role: "doctor",
        doctor_fee: "600",
        Discount: "20",
        passwordHash: "$2a$10$example.hash.here",
        photoUrl: "https://images.unsplash.com/photo-1594824242633-d9b9b4b3fd31?w=150&h=150&fit=crop&crop=face",
        specialty: "Pediatrician",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Dr. John Smith",
        email: "dr.john@cliniccare.com",
        phone: "+923001234570",
        role: "doctor",
        doctor_fee: "550",
        Discount: "5",
        passwordHash: "$2a$10$example.hash.here",
        photoUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
        specialty: "Orthopedic Surgeon",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Dr. Fatima Ali",
        email: "dr.fatima@cliniccare.com",
        phone: "+923001234571",
        role: "doctor",
        doctor_fee: "450",
        Discount: "12",
        passwordHash: "$2a$10$example.hash.here",
        photoUrl: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=150&h=150&fit=crop&crop=face",
        specialty: "Dermatologist",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Dr. Michael Brown",
        email: "dr.michael@cliniccare.com",
        phone: "+923001234572",
        role: "doctor",
        doctor_fee: "700",
        Discount: "8",
        passwordHash: "$2a$10$example.hash.here",
        photoUrl: "https://images.unsplash.com/photo-1584467735871-8dd03eee3931?w=150&h=150&fit=crop&crop=face",
        specialty: "Neurologist",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Sample Patients
    const patients = [
      {
        _id: new ObjectId(),
        name: "Ali Hassan",
        email: "ali.hassan@example.com",
        phone: "+923009876543",
        role: "patient",
        passwordHash: "$2a$10$example.hash.here",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        name: "Sara Ahmad",
        email: "sara.ahmad@example.com",
        phone: "+923009876544",
        role: "patient",
        passwordHash: "$2a$10$example.hash.here",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert doctors and patients
    console.log("Inserting doctors...");
    await db.collection("users").insertMany(doctors);
    console.log(`Inserted ${doctors.length} doctors`);
    
    console.log("Inserting patients...");
    await db.collection("users").insertMany(patients);
    console.log(`Inserted ${patients.length} patients`);
    
    // Create doctor schedules
    const schedules = doctors.map(doctor => ({
      _id: new ObjectId(),
      doctorId: doctor._id,
      days: [
        {
          dayOfWeek: "Monday",
          isOffDay: false,
          morningStart: "09:00",
          morningEnd: "12:00",
          eveningStart: "16:00",
          eveningEnd: "20:00",
          slotduration: "30"
        },
        {
          dayOfWeek: "Tuesday",
          isOffDay: false,
          morningStart: "09:00",
          morningEnd: "12:00",
          eveningStart: "16:00",
          eveningEnd: "20:00",
          slotduration: "30"
        },
        {
          dayOfWeek: "Wednesday",
          isOffDay: false,
          morningStart: "09:00",
          morningEnd: "12:00",
          eveningStart: "16:00",
          eveningEnd: "20:00",
          slotduration: "30"
        },
        {
          dayOfWeek: "Thursday",
          isOffDay: false,
          morningStart: "09:00",
          morningEnd: "12:00",
          eveningStart: "16:00",
          eveningEnd: "20:00",
          slotduration: "30"
        },
        {
          dayOfWeek: "Friday",
          isOffDay: true,
          morningStart: "",
          morningEnd: "",
          eveningStart: "",
          eveningEnd: "",
          slotduration: "30"
        },
        {
          dayOfWeek: "Saturday",
          isOffDay: false,
          morningStart: "10:00",
          morningEnd: "13:00",
          eveningStart: "17:00",
          eveningEnd: "21:00",
          slotduration: "30"
        },
        {
          dayOfWeek: "Sunday",
          isOffDay: true,
          morningStart: "",
          morningEnd: "",
          eveningStart: "",
          eveningEnd: "",
          slotduration: "30"
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    console.log("Inserting doctor schedules...");
    await db.collection("doctor_schedules").insertMany(schedules);
    console.log(`Inserted ${schedules.length} doctor schedules`);
    
    // Create sample appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    const appointments = [
      {
        _id: new ObjectId(),
        doctorId: doctors[0]._id,
        patientId: patients[0]._id,
        date: tomorrow.toISOString().split('T')[0],
        time: "09:30",
        status: "confirmed",
        doctorName: doctors[0].name,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        doctorId: doctors[1]._id,
        patientId: patients[0]._id,
        date: dayAfterTomorrow.toISOString().split('T')[0],
        time: "16:00",
        status: "pending",
        doctorName: doctors[1].name,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId(),
        doctorId: doctors[2]._id,
        patientId: patients[1]._id,
        date: tomorrow.toISOString().split('T')[0],
        time: "11:00",
        status: "confirmed",
        doctorName: doctors[2].name,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log("Inserting sample appointments...");
    await db.collection("appointments").insertMany(appointments);
    console.log(`Inserted ${appointments.length} appointments`);
    
    console.log("\n=== Demo Data Summary ===");
    console.log(`✅ ${doctors.length} Doctors added`);
    console.log(`✅ ${patients.length} Patients added`);
    console.log(`✅ ${schedules.length} Doctor schedules added`);
    console.log(`✅ ${appointments.length} Sample appointments added`);
    
    console.log("\n=== Sample Login Credentials ===");
    console.log("Patient Login:");
    console.log("Email: ali.hassan@example.com");
    console.log("Password: 123456 (simple password for demo)");
    console.log("\nEmail: sara.ahmad@example.com");
    console.log("Password: 123456 (simple password for demo)");
    
    console.log("\n=== Demo data successfully inserted! ===");
    
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await client.close();
    console.log("Database connection closed");
  }
}

seedDatabase();
