'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { BottomNav, ActiveTab } from '@/components/BottomNav';
import { DashboardView } from '@/modules/dashboard/DashboardView';
import { TimelineView } from '@/modules/timeline/TimelineView';
import { TasksView } from '@/modules/tasks/TasksView';
import { AIMemoryView } from '@/modules/ai-memory/AIMemoryView';
import { ReportsView } from '@/modules/reports/ReportsView';
import { SettingsView } from '@/modules/settings/SettingsView';
import { VoiceJournalModal } from '@/modules/voice-journal/VoiceJournalModal';
import { AIOrganizerModal } from '@/modules/ai-organizer/AIOrganizerModal';
import { EntryDetailModal } from '@/modules/timeline/EntryDetailModal';
import { DailyEntry, Task, Category, Person, UserSettings } from '@/types';
import { db, initializeDatabase } from '@/services/database';
import { getTodayDateString } from '@/lib/utils';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [isOrganizerModalOpen, setIsOrganizerModalOpen] = useState<boolean>(false);
  const [organizerTargetEntry, setOrganizerTargetEntry] = useState<DailyEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);

  // Load database data
  const refreshData = useCallback(async () => {
    try {
      await initializeDatabase();
      const allEntries = await db.daily_entries.orderBy('createdAt').reverse().toArray();
      const allTasks = await db.tasks.orderBy('createdAt').reverse().toArray();
      const allCategories = await db.categories.toArray();
      const allPeople = await db.people.orderBy('mentionCount').reverse().toArray();
      const settings = await db.user_settings.get('default');

      setEntries(allEntries);
      setTasks(allTasks);
      setCategories(allCategories);
      setPeople(allPeople);
      setUserSettings(settings || null);
    } catch (err) {
      console.error('Error refreshing app data:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Register Service Worker for PWA and force check update
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
          console.log('Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => console.warn('Service Worker registration failed:', err));
    }
  }, [refreshData]);

  // Today's entry
  const todayStr = getTodayDateString();
  const todayEntry = entries.find((e) => e.date === todayStr) || null;
  const pendingTasks = tasks.filter((t) => t.status === 'todo');

  const handleToggleTask = async (taskId: string, currentStatus: 'todo' | 'completed') => {
    const nextStatus = currentStatus === 'todo' ? 'completed' : 'todo';
    await db.tasks.update(taskId, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
    refreshData();
  };

  const handleOpenDetail = (entry: DailyEntry) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  const handleOpenAIOrganizer = (entry: DailyEntry) => {
    setOrganizerTargetEntry(entry);
    setIsOrganizerModalOpen(true);
  };

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenReports={() => setActiveTab('reports')}
      />

      {/* Main Content Modules */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'dashboard' && (
          <DashboardView
            userName={userSettings?.userName || 'Explorador'}
            todayEntry={todayEntry}
            recentEntries={entries}
            pendingTasks={pendingTasks}
            onOpenRecord={() => setIsRecordModalOpen(true)}
            onSelectEntry={handleOpenDetail}
            onNavigate={(tab) => setActiveTab(tab)}
            onToggleTask={handleToggleTask}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineView
            entries={entries}
            categories={categories}
            onSelectEntry={handleOpenDetail}
            onOpenRecord={() => setIsRecordModalOpen(true)}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            entries={entries}
            onTasksChanged={refreshData}
            onSelectEntry={handleOpenDetail}
          />
        )}

        {activeTab === 'memory' && (
          <AIMemoryView
            entries={entries}
            onSelectEntry={handleOpenDetail}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            entries={entries}
            tasks={tasks}
            categories={categories}
            people={people}
            onBack={() => setActiveTab('dashboard')}
            onSelectEntry={handleOpenDetail}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onBack={() => setActiveTab('dashboard')}
            onDataReset={refreshData}
          />
        )}
      </div>

      {/* Persistent Bottom Mobile Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenRecord={() => setIsRecordModalOpen(true)}
      />

      {/* Voice Journal Recording Modal */}
      <VoiceJournalModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onEntrySaved={(entry) => {
          refreshData();
        }}
        onTriggerAIOrganize={(entry) => {
          handleOpenAIOrganizer(entry);
        }}
      />

      {/* AI Organizer Modal */}
      <AIOrganizerModal
        isOpen={isOrganizerModalOpen}
        entry={organizerTargetEntry}
        onClose={() => {
          setIsOrganizerModalOpen(false);
          setOrganizerTargetEntry(null);
        }}
        onComplete={() => {
          refreshData();
        }}
      />

      {/* Entry Detail & Edit Modal */}
      <EntryDetailModal
        isOpen={isDetailModalOpen}
        entry={selectedEntry}
        categories={categories}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEntry(null);
        }}
        onEntryUpdated={() => {
          refreshData();
        }}
        onEntryDeleted={() => {
          refreshData();
        }}
        onTriggerAI={(entry) => {
          handleOpenAIOrganizer(entry);
        }}
      />
    </main>
  );
}
