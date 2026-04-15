const mysql = require('mysql2/promise');
async function test() {
  const pool = await mysql.createConnection({host:'localhost',user:'root',database:'smart_edu_db'});
  const [enrollments] = await pool.query(
        `SELECT c.id as course_id, c.title as course_title, c.owner_id,
                u.id as teacher_user_id, u.full_name as teacher_name, u.avatar_url
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         LEFT JOIN users u ON (u.role='teacher' AND c.owner_id=u.id)
         WHERE e.status = 'approved'`
      );
  console.log('Enrollments:', enrollments);
  process.exit();
}
test();
