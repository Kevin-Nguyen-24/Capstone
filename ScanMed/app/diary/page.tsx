
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { getRegimens, updateRegimenStatus } from '@/lib/data';
import type { RegimenIntake, RegimenStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ThumbsUp, AlertTriangle, Clock, Camera } from 'lucide-react';
import { format, isToday } from 'date-fns';

const statusInfo: Record<RegimenStatus, { icon: React.ElementType, variant: "default" | "secondary" | "destructive" | "outline" | "warning" | null }> = {
  Punctual: { icon: ThumbsUp, variant: 'default' }, // Uses accent color via custom class
  Late: { icon: ThumbsUp, variant: 'warning' },
  Missed: { icon: AlertTriangle, variant: 'destructive' },
  Scheduled: { icon: Clock, variant: 'default' },
};

function RegimenCard({ regimen, isEarliestScheduled }: { regimen: RegimenIntake; isEarliestScheduled?: boolean }) {
  const router = useRouter();
  const StatusIcon = statusInfo[regimen.status].icon;
  const statusVariant = statusInfo[regimen.status].variant;
  
  const formattedTime = format(new Date(regimen.dateTime), "h:mm a");

  const handleGoIntake = () => {
    router.push('/capture');
  };

  return (
    <Card className="mx-4">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2 font-headline text-base">
                {formattedTime}
              </CardTitle>
              {isEarliestScheduled && (
                <Button 
                  size="sm" 
                  className="bg-accent text-accent-foreground hover:bg-accent/90 transition-transform active:scale-95"
                  onClick={handleGoIntake}
                >
                  <Camera className="mr-2 h-4 w-4" /> Go Intake
                </Button>
              )}
            </div>
            <Badge variant={statusVariant || 'default'} className={cn(
              'self-center',
              {'bg-accent text-accent-foreground hover:bg-accent/90': regimen.status === 'Punctual'},
              {'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30': regimen.status === 'Scheduled'}
            )}>
              <StatusIcon className="h-3 w-3 mr-1.5" />
              {regimen.status}
            </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {regimen.medications.map((med, index) => (
            <li key={index} className="flex justify-between items-center rounded-lg border bg-secondary/30 p-3">
              <span className="font-semibold text-secondary-foreground">{med.name}</span>
              <span className="text-muted-foreground">{med.dosage}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RegimenList({ regimens, isReminderList }: { regimens: RegimenIntake[], isReminderList?: boolean }) {
  if (regimens.length === 0) {
    return <p className="text-center text-muted-foreground p-8">No entries found.</p>;
  }
  
  const groupedByDate = regimens.reduce((acc, regimen) => {
    const date = format(new Date(regimen.dateTime), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(regimen);
    return acc;
  }, {} as Record<string, RegimenIntake[]>);
  
  const earliestRegimenId = isReminderList && regimens.length > 0 ? regimens[0].id : null;

  return (
      <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dailyRegimens]) => {
              const regimenDate = new Date(date.concat('T00:00:00'));
              const displayDate = isToday(regimenDate)
                ? 'Today'
                : format(regimenDate, "EEEE, MMMM d");

              return (
                <div key={date}>
                    <h2 className="px-4 pb-2 text-lg font-bold font-headline sticky top-[65px] bg-background/80 backdrop-blur-sm pt-2">{displayDate}</h2>
                    <div className="space-y-4">
                      {dailyRegimens.map(regimen => <RegimenCard key={regimen.id} regimen={regimen} isEarliestScheduled={regimen.id === earliestRegimenId} />)}
                    </div>
                </div>
              )
          })}
      </div>
  );
}

export default function DiaryPage() {
  const [reminders, setReminders] = useState<RegimenIntake[]>([]);
  const [history, setHistory] = useState<RegimenIntake[]>([]);
  
  useEffect(() => {
    let allRegimens = getRegimens();
    const now = new Date();
    
    // Auto-update overdue scheduled items to "Missed"
    let regimensWereUpdated = false;
    allRegimens.forEach(r => {
      if (r.status === 'Scheduled' && new Date(r.dateTime) < now) {
        // This function needs to update localStorage and return the updated list
        allRegimens = updateRegimenStatus(r.id, 'Missed');
        regimensWereUpdated = true;
      }
    });

    const finalRegimens = allRegimens;

    const scheduled = finalRegimens
      .filter(r => r.status === 'Scheduled')
      .sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const past = finalRegimens
      .filter(r => r.status !== 'Scheduled')
      .sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    setReminders(scheduled);
    setHistory(past);
  }, []);
  
  return (
    <AppLayout title="My Diary">
      <div className="pt-4">
        <Tabs defaultValue="reminders" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-auto max-w-[calc(100%-2rem)]">
            <TabsTrigger value="reminders">Reminder</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="reminders" className="mt-4">
            <RegimenList regimens={reminders} isReminderList={true} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <RegimenList regimens={history} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
