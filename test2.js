const mysql = require('mysql2/promise');
async function test() {
  const pool = await mysql.createConnection({host:'localhost',user:'root',database:'smart_edu_db'});

  // Role: Teacher
  const userId = 3; 

  const coursesQuery = 'WHERE owner_id = ? OR teacher_id = ?';
  const coursesParams = [userId, userId];

  const [courses] = await pool.query(`SELECT id, title FROM courses ${coursesQuery}`, coursesParams);
  if (!courses.length) { console.log('No courses'); process.exit(); }
  const courseIds = courses.map(c => c.id);

  const [enrollments] = await pool.query(
    `SELECT e.user_id as student_id, u.full_name as student_name, e.course_id 
     FROM enrollments e
     JOIN users u ON e.user_id = u.id
     WHERE e.course_id IN (?) AND e.status = 'approved'`,
    [courseIds]
  );
  if (!enrollments.length) { console.log('No enrollments'); process.exit(); }
  const studentIds = enrollments.map(e => e.student_id);

  const [parentLinks] = await pool.query(
    `SELECT psl.student_id, psl.parent_id, u.full_name as parent_name, u.avatar_url
     FROM parent_student_links psl
     JOIN users u ON psl.parent_id = u.id
     WHERE psl.student_id IN (?)`,
    [studentIds]
  );

  const contacts = [];
  for (const enr of enrollments) {
    const parentInfo = parentLinks.find(p => p.student_id === enr.student_id);
    if (parentInfo) {
      contacts.push({
        name: parentInfo.parent_name,
        courseTitle: courses.find(c => c.id === enr.course_id)?.title || 'Khóa học',
        studentName: enr.student_name
      });
    }
  }

  console.log('Teacher Contacts:', contacts);

  // Role: Parent
  const pUserId = 14;
  const [links] = await pool.query('SELECT student_id, (SELECT full_name FROM users WHERE id=student_id) as student_name FROM parent_student_links WHERE parent_id = ?', [pUserId]);
  console.log('Parent Links:', links);
  const student = links[0];
  const [enrs] = await pool.query(
    `SELECT c.id as course_id, c.title as course_title, 
            u.id as teacher_user_id, u.full_name as teacher_name, u.avatar_url
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     LEFT JOIN users u ON (u.role='teacher' AND c.owner_id=u.id)
     WHERE e.user_id = ? AND e.status = 'approved'`,
    [student.student_id]
  );
  console.log('Parent enrs:', enrs);

  process.exit();
}
test();
