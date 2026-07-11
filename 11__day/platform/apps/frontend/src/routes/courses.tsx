import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, Star, Clock, Award, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { api } from "../api/client";
import { coursesApi } from "../api/courses";

export const Route = createFileRoute("/courses")({
  component: CoursesPage
});

function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track enrollment states
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Record<string, boolean>>({});
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [curriculums, setCurriculums] = useState<Record<string, any>>({});
  const [loadingCurriculum, setLoadingCurriculum] = useState<Record<string, boolean>>({});
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Fetch courses on mount
  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      setError(null);
      try {
        const data = await coursesApi.getCourses();
        setCourses(Array.isArray(data) ? data : []);
        
        // Fetch student's enrollments to display correctly
        try {
          const enrollmentsRes = await api.get("/courses/me/enrollments");
          const enrolledIds: Record<string, boolean> = {};
          if (Array.isArray(enrollmentsRes.data)) {
            enrollmentsRes.data.forEach((e: any) => {
              enrolledIds[e.course_id] = true;
            });
          }
          setEnrolledCourseIds(enrolledIds);
        } catch (enrollErr) {
          // If auth/enrollment list fails (e.g. not logged in), ignore and proceed with normal listing
          console.warn("Could not retrieve user enrollments:", enrollErr);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  // Fetch course sections and lessons
  const loadCurriculum = async (courseId: string) => {
    if (curriculums[courseId]) return;
    setLoadingCurriculum(prev => ({ ...prev, [courseId]: true }));
    try {
      const detail = await coursesApi.getCourseById(courseId);
      setCurriculums(prev => ({ ...prev, [courseId]: detail }));
    } catch (err) {
      console.warn("Failed to load curriculum details for course:", courseId, err);
    } finally {
      setLoadingCurriculum(prev => ({ ...prev, [courseId]: false }));
    }
  };

  // Handle course enrollment
  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      // Call enrollment API in Go course service
      await api.post(`/courses/${courseId}/enroll`);
      setEnrolledCourseIds(prev => ({ ...prev, [courseId]: true }));
      
      // Expand and load curriculum on success
      setExpandedCourseId(courseId);
      await loadCurriculum(courseId);
    } catch (err: any) {
      alert(err.response?.data?.message || "Enrollment failed. Make sure you are authenticated.");
    } finally {
      setEnrollingId(null);
    }
  };

  const toggleExpandCourse = async (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(courseId);
      await loadCurriculum(courseId);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-300">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-4" />
        <p className="text-sm font-medium">Loading courses curriculum database...</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden px-6 lg:px-8 py-12 max-w-6xl mx-auto">
      {/* Glow shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-600/5 blur-[100px] pointer-events-none"></div>

      <div className="text-center mb-16 relative z-10">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white mb-4"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Explore DevOps & Dev Courses
        </h1>
        <p className="mx-auto max-w-2xl text-slate-400">
          Level up your engineering skills with curated, production-tested courses built by domain
          experts.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-8 text-center text-sm font-semibold max-w-xl mx-auto">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          No courses are currently published in the system database. Check back soon!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          {courses.map((course) => {
            const isEnrolled = enrolledCourseIds[course.id];
            const isExpanded = expandedCourseId === course.id;
            const curriculum = curriculums[course.id];
            const isLoadingCurr = loadingCurriculum[course.id];

            return (
              <Card
                key={course.id}
                className="flex flex-col hover:-translate-y-0.5 transition-all duration-300 h-fit"
              >
                {/* Header banner gradient */}
                <div
                  className="h-32 -mx-6 -mt-6 mb-6 rounded-t-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center"
                >
                  <BookOpen className="h-12 w-12 text-white/90" />
                </div>

                <div className="flex-1 flex flex-col">
                  <span className="inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 mb-3 border border-slate-700/50">
                    {course.level || "All Levels"}
                  </span>

                  <h3
                    className="text-xl font-bold text-white mb-2"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {course.title}
                  </h3>

                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    {course.description || "Learn core DevOps methodologies, Kubernetes clusters, and Docker delivery configurations."}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 mb-6">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-violet-400" />
                      {course.language || "English"}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      4.9 Rating
                    </span>
                  </div>

                  {isEnrolled ? (
                    <div className="space-y-4">
                      <Button
                        variant="secondary"
                        onClick={() => toggleExpandCourse(course.id)}
                        className="w-full justify-between"
                      >
                        {isExpanded ? "Hide Curriculum" : "View Curriculum"}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                      </Button>

                      {isExpanded && (
                        <div className="border-t border-slate-900 pt-4 mt-2 space-y-4">
                          {isLoadingCurr ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                            </div>
                          ) : curriculum && curriculum.sections?.length > 0 ? (
                            <div className="space-y-3">
                              {curriculum.sections.map((sec: any) => (
                                <div key={sec.id} className="space-y-1">
                                  <h4 className="text-xs font-bold text-slate-400 px-2 uppercase tracking-wider">
                                    {sec.title}
                                  </h4>
                                  <div className="space-y-0.5">
                                    {sec.lessons?.map((les: any) => (
                                      <button
                                        key={les.id}
                                        onClick={() => navigate({ to: `/watch/${course.id}/${les.id}` })}
                                        className="w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-300 hover:text-white transition-colors"
                                      >
                                        <span className="truncate">{les.title}</span>
                                        <ArrowRight className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-2 text-xs text-slate-500">
                              No lessons published for this course yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrollingId === course.id}
                      className="w-full justify-between group"
                    >
                      {enrollingId === course.id ? (
                        <>
                          Enrolling...
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        </>
                      ) : (
                        <>
                          Enroll Course
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
