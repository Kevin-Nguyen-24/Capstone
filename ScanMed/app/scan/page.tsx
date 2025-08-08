"use client";

import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScanLine, Loader2, Camera, RefreshCw, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';
import { addRegimens } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ScanPage() {
  const [view, setView] = useState<'camera' | 'captured' | 'scanning' | 'result'>('camera');
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [apiRequestPayload, setApiRequestPayload] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access.',
        });
        setHasCameraPermission(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
        setHasCameraPermission(false);
      }
    };

    if (view === 'camera') getCameraPermission();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [view, toast]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const maxWidth = 640, maxHeight = 480;
    let width = video.videoWidth, height = video.videoHeight;
    const ratio = width / height;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    canvas.width = width;
    canvas.height = height;
    ctx?.drawImage(video, 0, 0, width, height);
    const dataUri = canvas.toDataURL('image/png');
    setCapturedImage(dataUri);
    setView('captured');
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      setView('captured');
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!capturedImage) return;
    setView('scanning');
    setDebugMessage(null);
    setApiRequestPayload(null);
    setExtractedData(null);

    try {
      const blob = dataURLtoBlob(capturedImage);
      const formData = new FormData();
      formData.append("image", blob, "prescription.png");

      setApiRequestPayload("Uploading image to Flask API...");

      const response = await fetch("https://capstone-388033576344.europe-west1.run.app/predict_prescription", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) throw new Error(result.error || "Unknown error");

      setExtractedData(result.structured);
      setDebugMessage(JSON.stringify(result, null, 2));
      setView("result");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDebugMessage(message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to extract data. See details below.",
      });
      setView("result");
    }
  };

  const handleConfirm = () => {
    if (!extractedData?.length) return;
    const newRegimens = extractedData.map((med, i) => {
      const dateTime = new Date();
      dateTime.setDate(dateTime.getDate() + 1);
      dateTime.setHours(9 + (i * 4), 0, 0, 0);
      return {
        dateTime: dateTime.toISOString(),
        medications: [{ name: med.medicine, dosage: med.dosage }],
      };
    });

    addRegimens(newRegimens);
    toast({
      title: "Regimen Added",
      description: "New medications scheduled in your diary.",
      className: 'bg-accent text-accent-foreground border-accent',
    });
    router.push('/diary');
  };

  const handleRetry = () => {
    setView('camera');
    setExtractedData(null);
    setCapturedImage(null);
    setDebugMessage(null);
    setApiRequestPayload(null);
  };

  const isError = !!debugMessage && !extractedData;

  return (
    <AppLayout title="Scan Prescription">
      <div className="p-4 space-y-4">
        <div className="aspect-[4/3] w-full rounded-lg bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed">
          <video ref={videoRef} className={cn("w-full h-full object-cover", { 'hidden': view !== 'camera' })} autoPlay muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {capturedImage && view !== 'camera' && (
            <Image src={capturedImage} alt="Prescription" width={600} height={450} className="object-cover w-full h-full" />
          )}
          {view === 'camera' && hasCameraPermission === null && (
            <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
          )}
        </div>

        {hasCameraPermission === false && view === 'camera' && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>
              Please allow camera access to use this feature.
            </AlertDescription>
          </Alert>
        )}

        {view === 'camera' && (
          <div className="flex flex-col gap-4">
            <Button onClick={handleCapture} className="w-full" size="lg" disabled={!hasCameraPermission}>
              <Camera className="mr-2 h-5 w-5" /> Capture Prescription
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-5 w-5" /> Upload Image
            </Button>
          </div>
        )}

        {view === 'captured' && (
          <div className="flex gap-4">
            <Button onClick={handleRetry} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <Button onClick={handleScan} className="w-full" size="lg">
              <ScanLine className="mr-2 h-5 w-5" /> Scan
            </Button>
          </div>
        )}

        {view === 'scanning' && (
          <Button disabled className="w-full" size="lg">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Scanning...
          </Button>
        )}

        {view === 'result' && (
          <Card>
            <CardHeader>
              <CardTitle>{isError ? "Scan Failed" : "Extracted Medications"}</CardTitle>
              {!isError && <CardDescription>Review and confirm your extracted prescription.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              {extractedData?.map((med, i) => (
                <div key={i} className="border rounded-lg p-3 text-sm">
                  <p className="font-semibold">{med.medicine}, {med.dosage}</p>
                  {med.Instruction && <p className="text-muted-foreground">{med.Instruction}</p>}
                </div>
              ))}
              {(apiRequestPayload || debugMessage) && (
                <div className="space-y-4">
                  {apiRequestPayload && (
                    <div>
                      <Label htmlFor="request">Request</Label>
                      <Textarea id="request" readOnly value={apiRequestPayload} className="h-24 text-xs font-mono bg-secondary/50" />
                    </div>
                  )}
                  {debugMessage && (
                    <div>
                      <Label htmlFor="response">{isError ? "Error" : "Response"}</Label>
                      <Textarea id="response" readOnly value={debugMessage} className={cn("h-40 text-xs font-mono bg-secondary/50", isError && "text-destructive")} />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <Button onClick={handleRetry} variant="outline" className="w-full">Retry</Button>
                <Button onClick={handleConfirm} className="w-full bg-accent" disabled={isError}>Confirm</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function dataURLtoBlob(dataUrl: string): Blob {
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}