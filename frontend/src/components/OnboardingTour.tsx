'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface TourStep {
  id: string;
  targetId: string | null;
  title?: string;
  tooltip: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  isFinal?: boolean;
}

const dashboardSteps: TourStep[] = [
  {
    id: 'dashboard_overview',
    targetId: 'tour-dashboard-overview',
    title: 'Dashboard Overview',
    tooltip: 'Welcome to your learning dashboard! This card shows a high-level summary of your assigned training, completed courses, and average quiz scores.',
    position: 'bottom',
  },
  {
    id: 'dashboard_assigned',
    targetId: 'tour-dashboard-assigned-courses',
    title: 'Assigned Courses',
    tooltip: 'This section shows courses assigned to you. You can easily see which courses are pending and resume your learning directly.',
    position: 'top',
  },
  {
    id: 'dashboard_progress',
    targetId: 'tour-course-progress',
    title: 'Progress Tracking',
    tooltip: 'Use this progress bar to track your course completion status. It increases automatically as you finish modules.',
    position: 'bottom',
  },
  {
    id: 'dashboard_activity',
    targetId: 'tour-dashboard-recent-activity',
    title: 'Recent Activity',
    tooltip: 'Monitor your training history here. It logs completed video lessons, assignment uploads, and quiz scores.',
    position: 'left',
  }
];

const coursesSteps: TourStep[] = [
  {
    id: 'courses_assigned',
    targetId: 'tour-courses-assigned-section',
    title: 'Assigned Courses List',
    tooltip: 'This section lists all courses you are explicitly enrolled in. You must complete these to meet your training requirements.',
    position: 'top',
  },
  {
    id: 'courses_available',
    targetId: 'tour-courses-available-section',
    title: 'Available Courses List',
    tooltip: 'If optional or elective courses are provided by your company, they will appear here. Click any card to enroll and begin learning.',
    position: 'top',
  },
  {
    id: 'courses_card',
    targetId: 'tour-courses-first-card',
    title: 'Course Card',
    tooltip: 'Each card displays the course title, description, and module count. Click on a card to view its syllabus.',
    position: 'right',
  },
  {
    id: 'courses_details',
    targetId: 'tour-courses-card-details',
    title: 'Modules & Duration',
    tooltip: 'Check the total modules and estimated duration at the bottom of the card to plan your study schedule.',
    position: 'top',
  }
];

const courseDetailsSteps: TourStep[] = [
  {
    id: 'details_hero',
    targetId: 'tour-course-details-hero',
    title: 'Course Syllabus',
    tooltip: 'Here is the course overview. You can review your overall progress percentage and the specific due date for the course.',
    position: 'bottom',
  },
  {
    id: 'details_curriculum',
    targetId: 'tour-course-curriculum',
    title: 'Curriculum',
    tooltip: 'All modules are listed here in order. Subsequent modules are locked until you complete all activities in the previous ones.',
    position: 'top',
  },
  {
    id: 'details_start_module',
    targetId: 'tour-course-first-module',
    title: 'Start Module',
    tooltip: 'Click the first module card in the curriculum list to open the workspace and see the video lectures and quizzes inside.',
    position: 'top',
  }
];

const moduleSteps: TourStep[] = [
  {
    id: 'module_video',
    targetId: 'tour-module-tab-video',
    title: 'Video Lectures',
    tooltip: 'Watch video lectures in order to learn technical concepts. Your progress is saved automatically.',
    position: 'bottom',
  },
  {
    id: 'module_notes',
    targetId: 'tour-module-tab-notes',
    title: 'Study Notes',
    tooltip: 'Check this tab for downloadable notes, manuals, and cheat sheets to reinforce your learning.',
    position: 'bottom',
  },
  {
    id: 'module_task',
    targetId: 'tour-module-tab-task',
    title: 'Assignments',
    tooltip: 'If hands-on practice is required, you can upload your completed assignment files here for HR or admin review.',
    position: 'bottom',
  },
  {
    id: 'module_quiz',
    targetId: 'tour-module-tab-quiz',
    title: 'Quizzes & Assessments',
    tooltip: 'Unlock the quiz after completing videos, notes, and assignments. Pass the quiz to finalize and complete the module!',
    position: 'bottom',
  }
];

const settingsSteps: TourStep[] = [
  {
    id: 'settings_pic',
    targetId: 'tour-settings-profile-pic',
    title: 'Profile Picture',
    tooltip: 'Upload a clean, professional profile photo here. Supported formats: JPG, PNG, WEBP (under 5MB).',
    position: 'bottom',
  },
  {
    id: 'settings_info',
    targetId: 'tour-settings-profile-info',
    title: 'Profile Settings',
    tooltip: 'Keep your name, email, and phone number updated so administrative records remain accurate.',
    position: 'bottom',
  },
  {
    id: 'settings_options',
    targetId: 'tour-settings-account-options',
    title: 'Account Options',
    tooltip: 'Change your login password or customize email notifications for due dates and assignments here.',
    position: 'bottom',
  }
];

export default function OnboardingTour() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSteps, setActiveSteps] = useState<TourStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, isCentered: false });
  const [currentKey, setCurrentKey] = useState<string>('');
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 1. Determine if a mini-tour should start based on route
  useEffect(() => {
    if (loading || !user) {
      console.log("[Onboarding Tour Debug] loading or user is empty", { loading, user });
      return;
    }

    const isEmployee = user.role === 'employee';
    console.log("[Onboarding Tour Debug] User role detection", { role: user.role, isEmployee });
    if (!isEmployee) {
      setIsOpen(false);
      return;
    }

    let stepsForPage: TourStep[] = [];
    let key = '';

    if (pathname === '/dashboard') {
      stepsForPage = [
        ...dashboardSteps,
        {
          id: 'dashboard_final',
          targetId: null,
          isFinal: true,
          title: "Dashboard Tour Complete! 🎉",
          tooltip: "You have completed the Dashboard overview! Feel free to explore your assigned courses next.",
          position: 'center'
        }
      ];
      key = 'onboarding_tour_dashboard_completed';
    } else if (pathname === '/courses') {
      stepsForPage = [
        ...coursesSteps,
        {
          id: 'courses_final',
          targetId: null,
          isFinal: true,
          title: "Courses Library Tour Complete! 📚",
          tooltip: "You've finished exploring the course library! Now you can choose a course and start learning.",
          position: 'center'
        }
      ];
      key = 'onboarding_tour_courses_completed';
    } else if (pathname.match(/^\/courses\/[^\/]+$/)) {
      stepsForPage = [
        ...courseDetailsSteps,
        {
          id: 'details_final',
          targetId: null,
          isFinal: true,
          title: "Syllabus Tour Complete! 📋",
          tooltip: "You've completed the syllabus tour! Open a module to begin the curriculum lessons.",
          position: 'center'
        }
      ];
      key = 'onboarding_tour_details_completed';
    } else if (pathname.match(/^\/courses\/[^\/]+\/modules\/[^\/]+$/)) {
      stepsForPage = [
        ...moduleSteps,
        {
          id: 'module_final',
          targetId: null,
          isFinal: true,
          title: "Module Workspace Tour Complete! 🖥️",
          tooltip: "You've toured the module workspace! Watch the videos, read the notes, complete assignments, and take the quiz to finish.",
          position: 'center'
        }
      ];
      key = 'onboarding_tour_module_completed';
    } else if (pathname === '/profile') {
      stepsForPage = [
        ...settingsSteps,
        {
          id: 'settings_final',
          targetId: null,
          isFinal: true,
          title: "Settings Tour Complete! ⚙️",
          tooltip: "Settings tour complete! Your profile is all set up. Happy learning!",
          position: 'center'
        }
      ];
      key = 'onboarding_tour_settings_completed';
    }

    setCurrentKey(key);

    const isCompleted = localStorage.getItem("onboarding_tour_completed") === "true";
    console.log("[Onboarding Tour Debug] Route evaluation", {
      pathname,
      detectedTourKey: key,
      stepsCount: stepsForPage.length,
      isCompleted
    });

    if (stepsForPage.length > 0 && !isCompleted) {
      setIsOpen(true);
      setCurrentIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [user, pathname, loading]);

  // 2. Dynamically calculate which elements exist and are visible in the DOM
  useEffect(() => {
    if (!isOpen || !currentKey) {
      console.log("[Onboarding Tour Debug] evaluateSteps skipped", { isOpen, currentKey });
      return;
    }

    let rawSteps: TourStep[] = [];
    if (currentKey === 'onboarding_tour_dashboard_completed') {
      rawSteps = [
        ...dashboardSteps,
        {
          id: 'dashboard_final',
          targetId: null,
          isFinal: true,
          title: "Dashboard Tour Complete! 🎉",
          tooltip: "You have completed the Dashboard overview! Feel free to explore your assigned courses next.",
          position: 'center'
        }
      ];
    } else if (currentKey === 'onboarding_tour_courses_completed') {
      rawSteps = [
        ...coursesSteps,
        {
          id: 'courses_final',
          targetId: null,
          isFinal: true,
          title: "Courses Library Tour Complete! 📚",
          tooltip: "You've finished exploring the course library! Now you can choose a course and start learning.",
          position: 'center'
        }
      ];
    } else if (currentKey === 'onboarding_tour_details_completed') {
      rawSteps = [
        ...courseDetailsSteps,
        {
          id: 'details_final',
          targetId: null,
          isFinal: true,
          title: "Syllabus Tour Complete! 📋",
          tooltip: "You've completed the syllabus tour! Open a module to begin the curriculum lessons.",
          position: 'center'
        }
      ];
    } else if (currentKey === 'onboarding_tour_module_completed') {
      rawSteps = [
        ...moduleSteps,
        {
          id: 'module_final',
          targetId: null,
          isFinal: true,
          title: "Module Workspace Tour Complete! 🖥️",
          tooltip: "You've toured the module workspace! Watch the videos, read the notes, complete assignments, and take the quiz to finish.",
          position: 'center'
        }
      ];
    } else if (currentKey === 'onboarding_tour_settings_completed') {
      rawSteps = [
        ...settingsSteps,
        {
          id: 'settings_final',
          targetId: null,
          isFinal: true,
          title: "Settings Tour Complete! ⚙️",
          tooltip: "Settings tour complete! Your profile is all set up. Happy learning!",
          position: 'center'
        }
      ];
    }

    const evaluateSteps = () => {
      const filtered = rawSteps.filter(step => {
        if (!step.targetId) return true; // Final step has no target element
        const el = document.getElementById(step.targetId);
        if (!el) {
          console.log(`[Onboarding Tour Debug] Target ID NOT found in DOM: "${step.targetId}" for step "${step.id}"`);
          return false;
        }
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        if (!isVisible) {
          console.log(`[Onboarding Tour Debug] Target ID found but hidden (dimensions 0): "${step.targetId}" for step "${step.id}"`);
        }
        return isVisible;
      });

      console.log("[Onboarding Tour Debug] evaluateSteps result", {
        rawStepsCount: rawSteps.length,
        filteredStepsCount: filtered.length,
        filteredSteps: filtered.map(s => s.id)
      });

      setActiveSteps(prev => {
        const prevIds = prev.map(s => s.id).join(',');
        const currIds = filtered.map(s => s.id).join(',');
        if (prevIds === currIds) return prev;
        return filtered;
      });
    };

    evaluateSteps();

    // Check periodically for changes (e.g. data finishes loading)
    const interval = setInterval(evaluateSteps, 500);
    return () => clearInterval(interval);
  }, [isOpen, currentKey, pathname]);

  // 3. Viewport-aware updatePosition callback function
  const updatePosition = useCallback(() => {
    if (!isOpen || activeSteps.length === 0) return;
    const currentStep = activeSteps[currentIndex];
    if (!currentStep) return;

    if (currentStep.isFinal || !currentStep.targetId) {
      setSpotlightRect(null);
      setTooltipPos({ x: 0, y: 0, isCentered: true });
      return;
    }

    const el = document.getElementById(currentStep.targetId);
    if (!el) {
      setSpotlightRect(null);
      setTooltipPos({ x: 0, y: 0, isCentered: true });
      return;
    }

    const rect = el.getBoundingClientRect();
    setSpotlightRect(rect);

    const padding = 6;
    const margin = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Use measured dimensions of tooltip container, fallback to estimate
    let tooltipWidth = 320;
    let tooltipHeight = 180;
    if (tooltipRef.current) {
      const tRect = tooltipRef.current.getBoundingClientRect();
      tooltipWidth = tRect.width || 320;
      tooltipHeight = tRect.height || 180;
    }

    // Check available space on all sides of the target element
    const hasSpaceBottom = rect.bottom + padding + tooltipHeight + margin <= viewportHeight;
    const hasSpaceTop = rect.top - padding - tooltipHeight - margin >= 0;
    const hasSpaceRight = rect.right + padding + tooltipWidth + margin <= viewportWidth;
    const hasSpaceLeft = rect.left - padding - tooltipWidth - margin >= 0;

    const preferredPosition = currentStep.position || 'bottom';
    let chosenPlacement = preferredPosition;

    if (preferredPosition === 'bottom') {
      if (!hasSpaceBottom && hasSpaceTop) {
        chosenPlacement = 'top';
      }
    } else if (preferredPosition === 'top') {
      if (!hasSpaceTop && hasSpaceBottom) {
        chosenPlacement = 'bottom';
      }
    } else if (preferredPosition === 'right') {
      if (!hasSpaceRight && hasSpaceLeft) {
        chosenPlacement = 'left';
      } else if (!hasSpaceRight && !hasSpaceLeft) {
        if (hasSpaceBottom) chosenPlacement = 'bottom';
        else if (hasSpaceTop) chosenPlacement = 'top';
      }
    } else if (preferredPosition === 'left') {
      if (!hasSpaceLeft && hasSpaceRight) {
        chosenPlacement = 'right';
      } else if (!hasSpaceLeft && !hasSpaceRight) {
        if (hasSpaceBottom) chosenPlacement = 'bottom';
        else if (hasSpaceTop) chosenPlacement = 'top';
      }
    }

    let top = 0;
    let left = 0;

    if (chosenPlacement === 'right') {
      left = rect.right + padding;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (chosenPlacement === 'left') {
      left = rect.left - padding - tooltipWidth;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (chosenPlacement === 'top') {
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.top - padding - tooltipHeight;
    } else {
      // bottom
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.bottom + padding;
    }

    // Clamp coordinates to remain fully inside the viewport with minimum margin of 16px
    if (left < margin) left = margin;
    if (left + tooltipWidth > viewportWidth - margin) {
      left = viewportWidth - tooltipWidth - margin;
    }
    if (top < margin) top = margin;
    if (top + tooltipHeight > viewportHeight - margin) {
      top = viewportHeight - tooltipHeight - margin;
    }

    setTooltipPos({
      x: left,
      y: top,
      isCentered: false,
    });
  }, [isOpen, activeSteps, currentIndex]);

  // 4. Listen to window scroll & resize events
  useEffect(() => {
    if (!isOpen || activeSteps.length === 0) return;

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const timer = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearTimeout(timer);
    };
  }, [isOpen, activeSteps, currentIndex, updatePosition]);

  // 5. Trigger repositioning when tooltip size changes (e.g. layout shift, zoom, or content wrapping)
  useEffect(() => {
    if (!isOpen || !tooltipRef.current) return;

    const observer = new ResizeObserver(() => {
      updatePosition();
    });

    observer.observe(tooltipRef.current);
    return () => observer.disconnect();
  }, [isOpen, currentIndex, updatePosition]);

  // Log active state changes
  useEffect(() => {
    console.log("[Onboarding Tour Debug] Current render state variables", {
      isOpen,
      currentIndex,
      activeStepsCount: activeSteps.length,
      currentStepId: activeSteps[currentIndex]?.id || 'none'
    });
  }, [isOpen, currentIndex, activeSteps]);

  if (!isOpen || activeSteps.length === 0) return null;

  const currentStep = activeSteps[currentIndex];
  if (!currentStep) return null;

  const handleNext = () => {
    if (currentIndex < activeSteps.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_tour_completed', 'true');
    if (currentKey) {
      localStorage.setItem(currentKey, 'true');
    }
    setIsOpen(false);
  };

  const padding = 6;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] cursor-default pointer-events-auto bg-transparent"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {spotlightRect && !currentStep.isFinal && (
        <motion.div
          initial={false}
          animate={{
            top: spotlightRect.top - padding,
            left: spotlightRect.left - padding,
            width: spotlightRect.width + padding * 2,
            height: spotlightRect.height + padding * 2,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 250 }}
          className="fixed rounded-lg pointer-events-none z-[101]"
          style={{
            boxShadow: '0 0 0 4px rgba(242, 101, 34, 0.45), 0 0 0 9999px rgba(15, 23, 42, 0.75)',
          }}
        />
      )}

      {(currentStep.isFinal || !spotlightRect) && (
        <div className="fixed inset-0 bg-slate-950/75 z-[101] pointer-events-none transition-opacity duration-300" />
      )}

      <div className="fixed inset-0 z-[102] pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              x: tooltipPos.isCentered ? '-50%' : tooltipPos.x,
              y: tooltipPos.isCentered ? '-50%' : tooltipPos.y,
              scale: 1,
              opacity: 1,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: tooltipPos.isCentered ? '50%' : 0,
              left: tooltipPos.isCentered ? '50%' : 0,
              width: tooltipPos.isCentered ? '420px' : '320px',
            }}
            className="bg-[#2D3250] text-white border border-white/10 rounded-xl shadow-2xl p-6 pointer-events-auto select-none flex flex-col gap-4 text-left"
          >
            {currentStep.isFinal ? (
              <div className="flex flex-col text-center gap-4 py-2">
                <h3 className="text-2xl font-bold text-white leading-tight">
                  {currentStep.title}
                </h3>
                <p className="text-white/80 text-sm font-medium leading-relaxed px-2">
                  {currentStep.tooltip}
                </p>
                <div className="mt-4">
                  <Button
                    onClick={handleComplete}
                    className="w-full bg-[#F26522] hover:bg-[#d55418] text-white font-bold py-6 text-base rounded-lg shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {currentKey === 'onboarding_tour_settings_completed' ? 'Finish' : 'Got it!'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-[#F26522] uppercase tracking-wider">
                    Step {currentIndex + 1} of {activeSteps.length}
                  </span>
                  <button 
                    onClick={handleSkip}
                    className="text-white/40 hover:text-white/70 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Skip Tour
                  </button>
                </div>

                {currentStep.title && (
                  <h4 className="text-sm font-bold text-white tracking-tight leading-none mt-1">
                    {currentStep.title}
                  </h4>
                )}

                <p className="text-white/80 text-[13px] font-medium leading-relaxed">
                  {currentStep.tooltip}
                </p>

                <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-1">
                  {currentIndex > 0 ? (
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-1 h-8 text-xs font-bold transition-all cursor-pointer"
                    >
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  <Button
                    onClick={handleNext}
                    className="bg-[#F26522] hover:bg-[#d55418] text-white px-4 py-1 h-8 text-xs font-bold rounded shadow transition-all cursor-pointer"
                  >
                    {currentIndex === activeSteps.length - 2 ? 'Done' : 'Next'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
