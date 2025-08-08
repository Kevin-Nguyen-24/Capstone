"use client";

import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, RefreshCw, Loader2, Check, X, AlertCircle, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';
import { getRegimens, updateRegimenStatus } from '@/lib/data';
import type { RegimenIntake } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type MatchStatus = 'Match' | 'Mismatch' | 'Partial Match';

export default function CapturePage() {
  const [nextRegimen, setNextRegimen] = useState<RegimenIntake | null>(null);
  const [view, setView] = useState<'camera' | 'captured' | 'matching' | 'result'>('camera');
  const [matchResult, setMatchResult] = useState<{ status: MatchStatus; image: string } | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    const allRegimens = getRegimens();
    const upcoming = allRegimens
      .filter(r => r.status === 'Scheduled')
      .sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    setNextRegimen(upcoming[0] || null);
  }, []);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({ variant: 'destructive', title: 'Camera Not Supported', description: 'Your browser does not support camera access.' });
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Enable permissions in browser settings.' });
      }
    };

    if (view === 'camera') getCameraPermission();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [view, toast]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const ratio = video.videoWidth / video.videoHeight;
    let width = 640;
    let height = width / ratio;
    canvas.width = width;
    canvas.height = height;
    ctx?.drawImage(video, 0, 0, width, height);
    setCapturedImage(canvas.toDataURL('image/png'));
    setView('captured');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      setView('captured');
    };
    reader.readAsDataURL(file);
  };

  const handleMatch = async () => {
    if (!capturedImage) return;
    setView('matching');
    try {
      const blob = await fetch(capturedImage).then(res => res.blob());
      const formData = new FormData();
      formData.append('image', blob, 'upload.png');

      const res = await fetch('https://capstone-388033576344.europe-west1.run.app/predict_scan_pills', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const status: MatchStatus = data.unmatched.length === 0 ? 'Match' : (data.matched.length > 0 ? 'Partial Match' : 'Mismatch');
      setMatchResult({ status, image: data.image });
      setView('result');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Match Failed', description: 'Try again later.' });
      setView('captured');
    }
  };

  const handleRetry = () => {
    setView('camera');
    setCapturedImage(null);
    setMatchResult(null);
  };

  const handleIntake = () => {
    if (!nextRegimen) return;
    updateRegimenStatus(nextRegimen.id, 'Punctual');
    toast({ title: 'Intake Recorded', description: 'Medication intake logged.' });
    router.push('/diary');
  };

  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'Match': return <Badge className="bg-accent text-accent-foreground"><Check className="mr-2 h-4 w-4"/>Match</Badge>;
      case 'Partial Match': return <Badge variant="secondary"><AlertCircle className="mr-2 h-4 w-4"/>Partial</Badge>;
      case 'Mismatch': return <Badge variant="destructive"><X className="mr-2 h-4 w-4"/>Mismatch</Badge>;
    }
  };

  return (
    <AppLayout title="Medication Capture">
      <div className="p-4 space-y-4">
        {nextRegimen ? (
          <Card>
            <CardHeader><CardTitle className="text-lg">Next Intake</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm pl-5 text-muted-foreground list-disc">
                {nextRegimen.medications.map((m, i) => <li key={i}><span className="font-semibold text-foreground">{m.name}</span> ({m.dosage})</li>)}
              </ul>
            </CardContent>
          </Card>
        ) : <p className="text-center text-muted-foreground">No upcoming medication scheduled.</p>}

        <div className="aspect-[4/3] rounded-lg bg-secondary border-2 border-dashed overflow-hidden">
          <video ref={videoRef} className={cn("w-full h-full object-cover", { hidden: view !== 'camera' })} autoPlay muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {(view !== 'camera' && capturedImage) && (
            <Image src={matchResult?.image || capturedImage} alt="Medication" width={600} height={450} className="w-full h-full object-cover" />
          )}
        </div>

        {view === 'camera' && (
          <div className="flex gap-4">
            <Button onClick={handleCapture} className="w-full" disabled={!hasCameraPermission}><Camera className="mr-2"/>Capture</Button>
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline"><Upload className="mr-2"/>Upload</Button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          </div>
        )}

        {view === 'captured' && (
          <div className="flex gap-4">
            <Button onClick={handleRetry} variant="outline" className="w-full"><RefreshCw className="mr-2"/>Retake</Button>
            <Button onClick={handleMatch} className="w-full bg-primary">Confirm and Match</Button>
          </div>
        )}

        {view === 'matching' && <Button disabled className="w-full"><Loader2 className="mr-2 animate-spin" />Matching...</Button>}

        {view === 'result' && matchResult && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">{getStatusBadge(matchResult.status)}</div>
            <p className="text-muted-foreground text-sm">
              {matchResult.status === 'Match' && 'All medications match your regimen.'}
              {matchResult.status === 'Partial Match' && 'Some medications match. Please review.'}
              {matchResult.status === 'Mismatch' && 'Medications do not match. Try again.'}
            </p>
            <div className="flex gap-4">
              <Button onClick={handleRetry} variant="outline" className="w-full"><RefreshCw className="mr-2"/>Retry</Button>
              <Button onClick={handleIntake} disabled={matchResult.status === 'Mismatch'} className="w-full bg-accent"><Check className="mr-2"/>Log Intake</Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
