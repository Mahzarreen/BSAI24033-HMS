const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

const doctorPassword = 'Doctor@123';
const staffPassword = 'Staff@123';
const adminPassword = 'Admin@123';

function pad(n) {
  return String(n).padStart(3, '0');
}

function dateAt(daysFromToday, hour, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

function randomFrom(list, index) {
  return list[index % list.length];
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const adminPass = await bcrypt.hash(adminPassword, 10);
    const doctorPass = await bcrypt.hash(doctorPassword, 10);
    const staffPass = await bcrypt.hash(staffPassword, 10);

    // Clean only previously generated mock data, not your manually added data.
    await client.query(`DELETE FROM patients WHERE mrn LIKE 'MRN-MOCK-%'`);
    await client.query(`DELETE FROM users WHERE email LIKE 'dr.%@hms.local' OR email LIKE 'staff.%@hms.local'`);

    // Default login users.
    await client.query(
      `INSERT INTO users(name,email,password_hash,role,phone) VALUES
        ('System Administrator','admin@hms.local',$1,'admin','03000000001'),
        ('Dr. Ayesha Khan','doctor@hms.local',$2,'doctor','03000000002'),
        ('Reception Staff','staff@hms.local',$3,'staff','03000000003')
       ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        is_active = TRUE`,
      [adminPass, doctorPass, staffPass]
    );

    const departments = [
      ['General Medicine', 'General consultation and primary care'],
      ['Emergency', 'Emergency and urgent care department'],
      ['Cardiology', 'Heart and blood pressure care'],
      ['Neurology', 'Brain, nerves, and neurological disorders'],
      ['Orthopedics', 'Bones, joints, trauma, and movement care'],
      ['Pediatrics', 'Child health and vaccination services'],
      ['Gynecology', 'Women health and maternity care'],
      ['Dermatology', 'Skin, hair, and allergy care'],
      ['ENT', 'Ear, nose, and throat services'],
      ['Radiology', 'Imaging and diagnostic scans'],
      ['Pathology', 'Laboratory and diagnostic testing'],
      ['Urology', 'Kidney and urinary tract care']
    ];

    for (const [name, description] of departments) {
      await client.query(
        `INSERT INTO departments(name,description)
         VALUES($1,$2)
         ON CONFLICT(name) DO UPDATE SET description = EXCLUDED.description`,
        [name, description]
      );
    }

    const staffUsers = [
      ['Nadia Receptionist', 'staff.nadia@hms.local', '03011110001'],
      ['Bilal Front Desk', 'staff.bilal@hms.local', '03011110002'],
      ['Sara Lab Coordinator', 'staff.sara@hms.local', '03011110003'],
      ['Hamza Billing Officer', 'staff.hamza@hms.local', '03011110004'],
      ['Amina Records Officer', 'staff.amina@hms.local', '03011110005'],
      ['Usman Admin Assistant', 'staff.usman@hms.local', '03011110006']
    ];

    for (const [name, email, phone] of staffUsers) {
      await client.query(
        `INSERT INTO users(name,email,password_hash,role,phone)
         VALUES($1,$2,$3,'staff',$4)
         ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone, password_hash=EXCLUDED.password_hash, is_active=TRUE`,
        [name, email, staffPass, phone]
      );
    }

    const doctorUsers = [
      ['Dr. Ahmed Raza', 'dr.ahmed.raza@hms.local', 'General Medicine', 'General Physician', 1800, 'A-101', '09:00', '17:00'],
      ['Dr. Fatima Noor', 'dr.fatima.noor@hms.local', 'Cardiology', 'Cardiologist', 3000, 'B-201', '10:00', '18:00'],
      ['Dr. Salman Tariq', 'dr.salman.tariq@hms.local', 'Neurology', 'Neurologist', 3500, 'B-204', '11:00', '19:00'],
      ['Dr. Hina Shah', 'dr.hina.shah@hms.local', 'Pediatrics', 'Child Specialist', 2200, 'C-102', '09:00', '16:00'],
      ['Dr. Kamran Ali', 'dr.kamran.ali@hms.local', 'Orthopedics', 'Orthopedic Surgeon', 3200, 'D-301', '12:00', '20:00'],
      ['Dr. Maryam Iqbal', 'dr.maryam.iqbal@hms.local', 'Gynecology', 'Gynecologist', 2800, 'C-205', '10:00', '17:00'],
      ['Dr. Zain Malik', 'dr.zain.malik@hms.local', 'Dermatology', 'Dermatologist', 2500, 'A-203', '14:00', '21:00'],
      ['Dr. Sana Javed', 'dr.sana.javed@hms.local', 'ENT', 'ENT Specialist', 2300, 'E-102', '09:30', '16:30'],
      ['Dr. Omar Farooq', 'dr.omar.farooq@hms.local', 'Emergency', 'Emergency Physician', 2000, 'ER-01', '08:00', '16:00'],
      ['Dr. Iqra Mehmood', 'dr.iqra.mehmood@hms.local', 'Urology', 'Urologist', 3000, 'D-204', '13:00', '20:00'],
      ['Dr. Adeel Hussain', 'dr.adeel.hussain@hms.local', 'Radiology', 'Radiologist', 2600, 'R-101', '09:00', '15:00'],
      ['Dr. Mahnoor Sheikh', 'dr.mahnoor.sheikh@hms.local', 'Pathology', 'Pathologist', 2400, 'LAB-02', '09:00', '17:00']
    ];

    for (const [name, email, dept, specialization, fee, room, availableFrom, availableTo] of doctorUsers) {
      const userResult = await client.query(
        `INSERT INTO users(name,email,password_hash,role,phone)
         VALUES($1,$2,$3,'doctor',$4)
         ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, is_active=TRUE
         RETURNING id`,
        [name, email, doctorPass, '0302' + Math.floor(1000000 + Math.random() * 8999999)]
      );

      const userId = userResult.rows[0].id;
      const deptId = (await client.query(`SELECT id FROM departments WHERE name=$1`, [dept])).rows[0].id;

      await client.query(
        `INSERT INTO doctors(user_id, department_id, specialization, consultation_fee, available_from, available_to, room_no)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(user_id) DO UPDATE SET
          department_id=EXCLUDED.department_id,
          specialization=EXCLUDED.specialization,
          consultation_fee=EXCLUDED.consultation_fee,
          available_from=EXCLUDED.available_from,
          available_to=EXCLUDED.available_to,
          room_no=EXCLUDED.room_no`,
        [userId, deptId, specialization, fee, availableFrom, availableTo, room]
      );
    }

    // Make sure the original sample doctor exists in doctors table too.
    await client.query(`
      INSERT INTO doctors(user_id, department_id, specialization, consultation_fee, room_no)
      SELECT u.id, d.id, 'General Physician', 1500, 'A-100'
      FROM users u CROSS JOIN departments d
      WHERE u.email='doctor@hms.local' AND d.name='General Medicine'
      ON CONFLICT(user_id) DO NOTHING
    `);

    const labTests = [
      ['Complete Blood Count', 'CBC basic blood screening', 1200, 'As per age/gender'],
      ['Blood Sugar Fasting', 'Fasting glucose test', 600, '70-100 mg/dL'],
      ['Blood Sugar Random', 'Random glucose test', 500, '< 140 mg/dL'],
      ['Lipid Profile', 'Cholesterol and triglycerides', 2500, 'As per component'],
      ['Liver Function Test', 'LFT enzymes and bilirubin', 2200, 'As per component'],
      ['Kidney Function Test', 'Urea and creatinine evaluation', 2300, 'As per component'],
      ['Urine Complete Examination', 'Routine urine analysis', 800, 'Normal/abnormal findings'],
      ['Thyroid Profile', 'T3, T4, TSH assessment', 2800, 'As per component'],
      ['Vitamin D', 'Vitamin D level test', 3500, '30-100 ng/mL'],
      ['HbA1c', 'Three-month diabetes control test', 1800, '< 5.7% normal'],
      ['CRP', 'Inflammation marker', 1600, '< 5 mg/L'],
      ['Dengue NS1', 'Dengue screening test', 2500, 'Negative'],
      ['Chest X-Ray', 'Basic chest imaging', 1800, 'Radiologist report'],
      ['ECG', 'Heart rhythm test', 1000, 'Cardiologist review']
    ];

    for (const [testName, description, price, normalRange] of labTests) {
      await client.query(
        `INSERT INTO lab_tests(test_name,description,price,normal_range)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(test_name) DO UPDATE SET description=EXCLUDED.description, price=EXCLUDED.price, normal_range=EXCLUDED.normal_range`,
        [testName, description, price, normalRange]
      );
    }

    const createdBy = (await client.query(`SELECT id FROM users WHERE email='staff@hms.local'`)).rows[0].id;

    const firstNamesMale = ['Ali', 'Usman', 'Hamza', 'Bilal', 'Hassan', 'Zeeshan', 'Danish', 'Fahad', 'Waqas', 'Imran', 'Arslan', 'Saad', 'Talha', 'Noman', 'Shahzaib'];
    const firstNamesFemale = ['Ayesha', 'Fatima', 'Hina', 'Sana', 'Maryam', 'Iqra', 'Kiran', 'Mahnoor', 'Nimra', 'Laiba', 'Zara', 'Areeba', 'Maha', 'Sadia', 'Noor'];
    const lastNames = ['Khan', 'Malik', 'Ahmed', 'Raza', 'Sheikh', 'Iqbal', 'Tariq', 'Hussain', 'Butt', 'Qureshi', 'Farooq', 'Javed', 'Akhtar', 'Nawaz', 'Shah'];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'O+', 'O-'];
    const histories = [
      'No major chronic disease',
      'Diabetes under medication',
      'Hypertension history',
      'Seasonal allergies',
      'Asthma history',
      'Previous minor surgery',
      'Migraine episodes',
      'Family history of heart disease'
    ];
    const allergies = ['None', 'Penicillin', 'Dust allergy', 'Pollen allergy', 'Seafood allergy', 'Sulfa drugs'];
    const addresses = ['Gulberg Lahore', 'Johar Town Lahore', 'Model Town Lahore', 'DHA Lahore', 'Iqbal Town Lahore', 'Bahria Town Lahore', 'Wapda Town Lahore', 'Garden Town Lahore'];

    const patientIds = [];

    for (let i = 1; i <= 70; i++) {
      const isMale = i % 2 === 0;
      const first = isMale ? randomFrom(firstNamesMale, i) : randomFrom(firstNamesFemale, i);
      const last = randomFrom(lastNames, i * 2);
      const gender = isMale ? 'male' : 'female';
      const year = 1965 + (i % 45);
      const month = String((i % 12) + 1).padStart(2, '0');
      const day = String((i % 27) + 1).padStart(2, '0');
      const mrn = `MRN-MOCK-${pad(i)}`;

      const result = await client.query(
        `INSERT INTO patients(mrn,full_name,gender,date_of_birth,phone,email,address,blood_group,emergency_contact,medical_history,allergies,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT(mrn) DO UPDATE SET
          full_name=EXCLUDED.full_name,
          gender=EXCLUDED.gender,
          date_of_birth=EXCLUDED.date_of_birth,
          phone=EXCLUDED.phone,
          email=EXCLUDED.email,
          address=EXCLUDED.address,
          blood_group=EXCLUDED.blood_group,
          emergency_contact=EXCLUDED.emergency_contact,
          medical_history=EXCLUDED.medical_history,
          allergies=EXCLUDED.allergies
         RETURNING id`,
        [
          mrn,
          `${first} ${last}`,
          gender,
          `${year}-${month}-${day}`,
          `03${10 + (i % 80)}${String(1000000 + i * 3217).slice(0, 7)}`,
          `patient${i}@example.com`,
          randomFrom(addresses, i),
          randomFrom(bloodGroups, i),
          `03${20 + (i % 60)}${String(2000000 + i * 2541).slice(0, 7)}`,
          randomFrom(histories, i),
          randomFrom(allergies, i),
          createdBy
        ]
      );

      patientIds.push(result.rows[0].id);
    }

    const doctorIds = (await client.query(`SELECT d.id, d.consultation_fee, u.name FROM doctors d JOIN users u ON u.id=d.user_id ORDER BY d.id`)).rows;
    const labTestIds = (await client.query(`SELECT id, test_name, price FROM lab_tests ORDER BY id`)).rows;

    const reasons = [
      'Fever and body pain',
      'Routine checkup',
      'Follow-up visit',
      'Headache and dizziness',
      'Chest discomfort',
      'Skin rash',
      'Child vaccination',
      'Back pain',
      'Throat infection',
      'Blood pressure review',
      'Diabetes follow-up',
      'Stomach pain'
    ];

    const statusesPast = ['completed', 'completed', 'completed', 'no_show', 'cancelled'];

    // 110 appointments across past, today, and coming days.
    // Slots are spaced so double-booking constraint is respected.
    for (let i = 1; i <= 110; i++) {
      const doctor = doctorIds[i % doctorIds.length];
      const patientId = patientIds[i % patientIds.length];
      const dayOffset = (i % 22) - 12;
      const hour = 9 + (i % 8);
      const minute = (Math.floor(i / doctorIds.length) % 2) * 30;
      const scheduledAt = dateAt(dayOffset, hour, minute);
      const status = dayOffset < -1 ? randomFrom(statusesPast, i) : 'scheduled';

      const apptResult = await client.query(
        `INSERT INTO appointments(patient_id, doctor_id, scheduled_at, duration_minutes, status, reason, notes, created_by)
         VALUES($1,$2,$3,30,$4,$5,$6,$7)
         RETURNING id`,
        [
          patientId,
          doctor.id,
          scheduledAt,
          status,
          `[MOCK] ${randomFrom(reasons, i)}`,
          status === 'completed' ? 'Vitals checked and consultation completed.' : null,
          createdBy
        ]
      );

      const appointmentId = apptResult.rows[0].id;

      const billNo = `BILL-MOCK-${pad(i)}`;

      const billResult = await client.query(
        `INSERT INTO bills(bill_no, patient_id, appointment_id, discount, tax, created_by)
         VALUES($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [
          billNo,
          patientId,
          appointmentId,
          i % 10 === 0 ? 300 : 0,
          i % 7 === 0 ? 150 : 0,
          createdBy
        ]
      );

      const billId = billResult.rows[0].id;

      await client.query(
        `INSERT INTO bill_items(bill_id,item_type,description,quantity,unit_price)
         VALUES($1,'consultation',$2,1,$3)`,
        [billId, `${doctor.name} consultation`, doctor.consultation_fee]
      );

      if (i % 3 === 0) {
        const test = labTestIds[i % labTestIds.length];
        const labStatus = status === 'completed'
          ? randomFrom(['completed', 'sample_collected', 'requested'], i)
          : 'requested';

        const labResult = await client.query(
          `INSERT INTO lab_requests(appointment_id,patient_id,doctor_id,lab_test_id,status,result_value,result_notes,completed_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id`,
          [
            appointmentId,
            patientId,
            doctor.id,
            test.id,
            labStatus,
            labStatus === 'completed' ? 'Within acceptable range' : null,
            labStatus === 'completed' ? 'Reviewed by lab staff.' : null,
            labStatus === 'completed' ? new Date() : null
          ]
        );

        await client.query(
          `INSERT INTO bill_items(bill_id,item_type,description,quantity,unit_price,source_lab_request_id)
           VALUES($1,'lab',$2,1,$3,$4)
           ON CONFLICT(source_lab_request_id) DO NOTHING`,
          [billId, test.test_name, test.price, labResult.rows[0].id]
        );
      }

      if (status === 'completed') {
        const summary = (await client.query(`SELECT total FROM bills WHERE id=$1`, [billId])).rows[0];
        const paid = i % 4 === 0 ? Number(summary.total) / 2 : Number(summary.total);

        await client.query(
          `INSERT INTO payments(bill_id,amount,method,received_by,notes)
           VALUES($1,$2,$3,$4,$5)`,
          [
            billId,
            paid,
            randomFrom(['cash', 'card', 'bank', 'insurance'], i),
            createdBy,
            'Mock payment entry'
          ]
        );
      }
    }

    await client.query('COMMIT');

    console.log('Enhanced mock data inserted successfully.');
    console.log('Admin login: admin@hms.local / Admin@123');
    console.log('Doctor login example: dr.ahmed.raza@hms.local / Doctor@123');
    console.log('Staff login example: staff.nadia@hms.local / Staff@123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Enhanced seed failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = seed;

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}