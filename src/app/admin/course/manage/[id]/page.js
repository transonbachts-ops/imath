import AdvancedCourseEditor from '@/app/components/AdvancedCourseEditor';

export default async function ManageCoursePage({ params }) {
  const { id } = await params;
  
  return (
    <div>
      <AdvancedCourseEditor courseId={id} />
    </div>
  );
}
