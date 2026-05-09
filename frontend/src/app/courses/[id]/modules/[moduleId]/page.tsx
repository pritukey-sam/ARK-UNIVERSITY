'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function ModuleRedirectPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
 const { id, moduleId } = use(params);
 const router = useRouter();

 useEffect(() => {
 router.replace(`/courses/${id}/modules/${moduleId}/video`);
 }, [id, moduleId, router]);

 return null;
}
