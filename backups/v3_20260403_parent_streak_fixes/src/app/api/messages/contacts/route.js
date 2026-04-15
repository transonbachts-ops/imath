import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_smart_edu_key_999';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let user = null;
  try {
    user = jwt.verify(token.value, JWT_SECRET);
  } catch(e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.userId || user.id;
  const role = user.role;

  try {
    // 1. If PARENT, get their child's teachers
    if (role === 'parent') {
      // Find children
      const [links] = await pool.query('SELECT student_id, (SELECT full_name FROM users WHERE id=student_id) as student_name FROM parent_student_links WHERE parent_id = ?', [userId]);
      if (!links.length) return NextResponse.json({ contacts: [] });
      const student = links[0]; // Assuming 1 child logic for now

      // Find enrollments and their matching teachers
      const [enrollments] = await pool.query(
        `SELECT c.id as course_id, c.title as course_title, 
                u.id as teacher_user_id, u.full_name as teacher_name, u.avatar_url
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         LEFT JOIN users u ON (u.role='teacher' AND c.owner_id=u.id)
         WHERE e.user_id = ? AND e.status = 'approved'`,
        [student.student_id]
      );

      // Fallback receiver ID so parent chat always works if a course lacks an owner_id config
      const [admins] = await pool.query('SELECT id, full_name, avatar_url FROM users WHERE role = "admin" ORDER BY id LIMIT 1');
      const admin = admins[0] || {};

      const contacts = enrollments.map(enr => ({
        contactId: enr.teacher_user_id || admin.id,
        name: enr.teacher_name || admin.full_name || 'Admin',
        avatar: enr.avatar_url || admin.avatar_url,
        courseId: enr.course_id,
        courseTitle: enr.course_title,
        studentId: student.student_id,
        studentName: student.student_name,
        role: 'teacher'
      }));

      // Deduplicate by teacher + course combination so we have clean chat heads
      const uniqueContacts = Array.from(new Set(contacts.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
      return NextResponse.json({ contacts: uniqueContacts });
    }

    // 2. If TEACHER or ADMIN, get the parents of their enrolled students
    // Admin sees all. Teacher sees only theirs.
    let coursesQuery = '';
    let coursesParams = [];
    if (role === 'teacher') {
      coursesQuery = 'WHERE owner_id = ?';
      coursesParams = [userId];
    }

    const [courses] = await pool.query(`SELECT id, title FROM courses ${coursesQuery}`, coursesParams);
    if (!courses.length) return NextResponse.json({ contacts: [] });
    const courseIds = courses.map(c => c.id);

    // Get all approved enrollments
    const [enrollments] = await pool.query(
      `SELECT e.user_id as student_id, u.full_name as student_name, e.course_id 
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       WHERE e.course_id IN (?) AND e.status = 'approved'`,
      [courseIds]
    );
    if (!enrollments.length) return NextResponse.json({ contacts: [] });
    const studentIds = enrollments.map(e => e.student_id);

    // Find parents for these students
    const [parentLinks] = await pool.query(
      `SELECT psl.student_id, psl.parent_id, u.full_name as parent_name, u.avatar_url
       FROM parent_student_links psl
       JOIN users u ON psl.parent_id = u.id
       WHERE psl.student_id IN (?)`,
      [studentIds]
    );

    // Map parent info back to courses
    const contacts = [];
    for (const enr of enrollments) {
      const parentInfo = parentLinks.find(p => p.student_id === enr.student_id);
      if (parentInfo) {
        contacts.push({
          contactId: parentInfo.parent_id,
          name: parentInfo.parent_name,
          avatar: parentInfo.avatar_url,
          courseId: enr.course_id,
          courseTitle: courses.find(c => c.id === enr.course_id)?.title || 'Khóa học',
          studentId: enr.student_id,
          studentName: enr.student_name,
          role: 'parent'
        });
      }
    }

    // Deduplicate array
    const uniqueContacts = Array.from(new Set(contacts.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
    return NextResponse.json({ contacts: uniqueContacts });

  } catch(e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
