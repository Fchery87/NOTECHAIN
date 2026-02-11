import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MeetingStorage, type MeetingInput } from '../meetingStorage';
import type { ActionItem } from '../../ai/transcription/actionItemExtractor';

// Mock the crypto module - use base64 encoding to preserve full data
vi.mock('@notechain/core-crypto', () => ({
  encryptData: vi.fn(async (data: string) => ({
    // Store full data using base64 encoding
    ciphertext: Buffer.from(data).toString('base64'),
    nonce: 'mock_nonce',
    authTag: 'mock_authTag',
  })),
  decryptData: vi.fn(async (encrypted: { ciphertext: string }) => {
    // Decode from base64 to get full data back
    return Buffer.from(encrypted.ciphertext, 'base64').toString('utf-8');
  }),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
}));

describe('MeetingStorage', () => {
  let storage: MeetingStorage;
  let mockKey: Uint8Array;

  const sampleActionItems: ActionItem[] = [
    {
      text: 'Prepare presentation slides',
      assignee: 'John',
      deadline: 'tomorrow',
      priority: 'high',
      completed: false,
    },
    {
      text: 'Review budget proposal',
      assignee: 'Sarah',
      completed: false,
    },
  ];

  const sampleMeetingInput: MeetingInput = {
    title: 'Weekly Team Meeting',
    date: new Date('2024-02-11T10:00:00Z'),
    duration: 3600,
    transcript: 'Today we discussed the Q1 roadmap. John will prepare the slides.',
    actionItems: sampleActionItems,
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create a fresh storage instance
    storage = new MeetingStorage();
    storage.clear();

    // Mock encryption key (32 bytes for XSalsa20-Poly1305)
    mockKey = new Uint8Array(32).fill(1);
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('saveMeeting', () => {
    it('should save a meeting with generated id and timestamps', async () => {
      const meeting = await storage.saveMeeting(sampleMeetingInput, mockKey);

      expect(meeting.id).toBeDefined();
      expect(meeting.title).toBe(sampleMeetingInput.title);
      expect(meeting.date).toEqual(sampleMeetingInput.date);
      expect(meeting.createdAt).toBeInstanceOf(Date);
      expect(meeting.updatedAt).toBeInstanceOf(Date);
    });

    it('should encrypt the transcript before storing', async () => {
      const { encryptData } = await import('@notechain/core-crypto');

      await storage.saveMeeting(sampleMeetingInput, mockKey);

      expect(encryptData).toHaveBeenCalledWith(sampleMeetingInput.transcript, mockKey);
    });

    it('should save calendar event id when provided', async () => {
      const inputWithCalendar = {
        ...sampleMeetingInput,
        calendarEventId: 'cal-event-123',
      };

      const meeting = await storage.saveMeeting(inputWithCalendar, mockKey);

      expect(meeting.calendarEventId).toBe('cal-event-123');
    });

    it('should save audio blob when provided', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const inputWithAudio = {
        ...sampleMeetingInput,
        audioBlob,
      };

      const meeting = await storage.saveMeeting(inputWithAudio, mockKey);

      expect(meeting.audioBlob).toBeDefined();
    });

    it('should make action items completed status false by default', async () => {
      const meeting = await storage.saveMeeting(sampleMeetingInput, mockKey);

      expect(meeting.actionItems).toHaveLength(2);
      meeting.actionItems.forEach((item: ActionItem) => {
        expect(item.completed).toBe(false);
      });
    });
  });

  describe('getMeeting', () => {
    it('should retrieve and decrypt a meeting by id', async () => {
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);
      const retrievedMeeting = await storage.getMeeting(savedMeeting.id, mockKey);

      expect(retrievedMeeting).not.toBeNull();
      expect(retrievedMeeting?.id).toBe(savedMeeting.id);
      expect(retrievedMeeting?.title).toBe(savedMeeting.title);
    });

    it('should decrypt the transcript when retrieving', async () => {
      const { decryptData } = await import('@notechain/core-crypto');
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);

      await storage.getMeeting(savedMeeting.id, mockKey);

      expect(decryptData).toHaveBeenCalled();
    });

    it('should return null for non-existent meeting', async () => {
      const meeting = await storage.getMeeting('non-existent-id', mockKey);

      expect(meeting).toBeNull();
    });

    it('should return meeting with correct action items structure', async () => {
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);
      const retrievedMeeting = await storage.getMeeting(savedMeeting.id, mockKey);

      expect(retrievedMeeting?.actionItems).toHaveLength(2);
      expect(retrievedMeeting?.actionItems[0]).toHaveProperty('text');
      expect(retrievedMeeting?.actionItems[0]).toHaveProperty('completed');
    });
  });

  describe('getAllMeetings', () => {
    it('should return all meetings sorted by date descending', async () => {
      const meeting1 = await storage.saveMeeting(
        {
          ...sampleMeetingInput,
          title: 'Meeting 1',
          date: new Date('2024-02-10T10:00:00Z'),
        },
        mockKey
      );

      const meeting2 = await storage.saveMeeting(
        {
          ...sampleMeetingInput,
          title: 'Meeting 2',
          date: new Date('2024-02-12T10:00:00Z'),
        },
        mockKey
      );

      const meeting3 = await storage.saveMeeting(
        {
          ...sampleMeetingInput,
          title: 'Meeting 3',
          date: new Date('2024-02-11T10:00:00Z'),
        },
        mockKey
      );

      const meetings = await storage.getAllMeetings(mockKey);

      expect(meetings).toHaveLength(3);
      expect(meetings[0].id).toBe(meeting2.id); // Latest first
      expect(meetings[1].id).toBe(meeting3.id);
      expect(meetings[2].id).toBe(meeting1.id); // Oldest last
    });

    it('should return empty array when no meetings exist', async () => {
      const meetings = await storage.getAllMeetings(mockKey);

      expect(meetings).toEqual([]);
    });

    it('should decrypt all meeting transcripts', async () => {
      const { decryptData } = await import('@notechain/core-crypto');

      await storage.saveMeeting(sampleMeetingInput, mockKey);
      await storage.saveMeeting({ ...sampleMeetingInput, title: 'Second Meeting' }, mockKey);

      await storage.getAllMeetings(mockKey);

      expect(decryptData).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateMeeting', () => {
    it('should update meeting fields', async () => {
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);

      const updates = {
        title: 'Updated Meeting Title',
        duration: 7200,
      };

      const updatedMeeting = await storage.updateMeeting(savedMeeting.id, updates, mockKey);

      expect(updatedMeeting.title).toBe('Updated Meeting Title');
      expect(updatedMeeting.duration).toBe(7200);
      expect(updatedMeeting.transcript).toBe(savedMeeting.transcript);
    });

    it('should update updatedAt timestamp', async () => {
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);
      const originalUpdatedAt = savedMeeting.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedMeeting = await storage.updateMeeting(
        savedMeeting.id,
        { title: 'Updated' },
        mockKey
      );

      expect(updatedMeeting.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should throw error for non-existent meeting', async () => {
      await expect(
        storage.updateMeeting('non-existent-id', { title: 'New Title' }, mockKey)
      ).rejects.toThrow('Meeting not found');
    });

    it('should update transcript and re-encrypt', async () => {
      const { encryptData } = await import('@notechain/core-crypto');
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);

      const newTranscript = 'Updated transcript with new action items.';
      await storage.updateMeeting(savedMeeting.id, { transcript: newTranscript }, mockKey);

      expect(encryptData).toHaveBeenLastCalledWith(newTranscript, mockKey);
    });

    it('should update action items', async () => {
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);

      const newActionItems: ActionItem[] = [
        {
          text: 'New action item',
          completed: true,
        },
      ];

      const updatedMeeting = await storage.updateMeeting(
        savedMeeting.id,
        { actionItems: newActionItems },
        mockKey
      );

      expect(updatedMeeting.actionItems).toHaveLength(1);
      expect(updatedMeeting.actionItems[0].text).toBe('New action item');
      expect(updatedMeeting.actionItems[0].completed).toBe(true);
    });
  });

  describe('deleteMeeting', () => {
    it('should remove meeting from storage', async () => {
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);

      await storage.deleteMeeting(savedMeeting.id);

      const retrievedMeeting = await storage.getMeeting(savedMeeting.id, mockKey);
      expect(retrievedMeeting).toBeNull();
    });

    it('should not throw when deleting non-existent meeting', async () => {
      await expect(async () => {
        await storage.deleteMeeting('non-existent-id');
      }).not.toThrow();
    });

    it('should remove meeting from getAllMeetings results', async () => {
      const savedMeeting = await storage.saveMeeting(sampleMeetingInput, mockKey);

      let meetings = await storage.getAllMeetings(mockKey);
      expect(meetings).toHaveLength(1);

      await storage.deleteMeeting(savedMeeting.id);

      meetings = await storage.getAllMeetings(mockKey);
      expect(meetings).toHaveLength(0);
    });
  });

  describe('searchMeetings', () => {
    it('should find meetings by title', async () => {
      await storage.saveMeeting({ ...sampleMeetingInput, title: 'Project Alpha Review' }, mockKey);
      await storage.saveMeeting({ ...sampleMeetingInput, title: 'Weekly Standup' }, mockKey);
      await storage.saveMeeting({ ...sampleMeetingInput, title: 'Project Beta Planning' }, mockKey);

      const results = await storage.searchMeetings('Alpha', mockKey);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Project Alpha Review');
    });

    it('should find meetings by transcript content', async () => {
      await storage.saveMeeting(
        {
          ...sampleMeetingInput,
          title: 'Meeting A',
          transcript: 'We discussed the budget for Q1.',
        },
        mockKey
      );
      await storage.saveMeeting(
        {
          ...sampleMeetingInput,
          title: 'Meeting B',
          transcript: 'The marketing strategy was approved.',
        },
        mockKey
      );

      const results = await storage.searchMeetings('budget', mockKey);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Meeting A');
    });

    it('should be case-insensitive', async () => {
      await storage.saveMeeting({ ...sampleMeetingInput, title: 'PROJECT Review' }, mockKey);

      const results = await storage.searchMeetings('project', mockKey);

      expect(results).toHaveLength(1);
    });

    it('should return empty array when no matches found', async () => {
      await storage.saveMeeting(sampleMeetingInput, mockKey);

      const results = await storage.searchMeetings('nonexistent', mockKey);

      expect(results).toEqual([]);
    });

    it('should search across multiple fields', async () => {
      await storage.saveMeeting({ ...sampleMeetingInput, title: 'Budget Meeting' }, mockKey);
      await storage.saveMeeting(
        {
          ...sampleMeetingInput,
          title: 'Planning Session',
          transcript: 'Budget was discussed extensively.',
        },
        mockKey
      );

      const results = await storage.searchMeetings('budget', mockKey);

      expect(results).toHaveLength(2);
    });
  });

  describe('calendar event linking', () => {
    it('should store calendar event id', async () => {
      const input = {
        ...sampleMeetingInput,
        calendarEventId: 'google-cal-123',
      };

      const meeting = await storage.saveMeeting(input, mockKey);

      expect(meeting.calendarEventId).toBe('google-cal-123');
    });

    it('should retrieve calendar event id', async () => {
      const input = {
        ...sampleMeetingInput,
        calendarEventId: 'outlook-cal-456',
      };

      const savedMeeting = await storage.saveMeeting(input, mockKey);
      const retrievedMeeting = await storage.getMeeting(savedMeeting.id, mockKey);

      expect(retrievedMeeting?.calendarEventId).toBe('outlook-cal-456');
    });

    it('should update calendar event id', async () => {
      const savedMeeting = await storage.saveMeeting(
        { ...sampleMeetingInput, calendarEventId: 'old-id' },
        mockKey
      );

      const updatedMeeting = await storage.updateMeeting(
        savedMeeting.id,
        { calendarEventId: 'new-id' },
        mockKey
      );

      expect(updatedMeeting.calendarEventId).toBe('new-id');
    });
  });

  describe('edge cases', () => {
    it('should handle meetings with optional fields omitted', async () => {
      const minimalInput: MeetingInput = {
        title: 'Minimal Meeting',
        date: new Date(),
        transcript: 'Short transcript.',
        actionItems: [],
      };

      const meeting = await storage.saveMeeting(minimalInput, mockKey);

      expect(meeting.duration).toBeUndefined();
      expect(meeting.calendarEventId).toBeUndefined();
      expect(meeting.audioBlob).toBeUndefined();
    });

    it('should handle special characters in transcript', async () => {
      const input = {
        ...sampleMeetingInput,
        transcript: 'Special chars: ñ, é, 中文, 🎉',
      };

      const savedMeeting = await storage.saveMeeting(input, mockKey);
      const retrievedMeeting = await storage.getMeeting(savedMeeting.id, mockKey);

      expect(retrievedMeeting?.transcript).toBe(input.transcript);
    });

    it('should handle very long transcripts', async () => {
      const longTranscript = 'word '.repeat(10000);
      const input = {
        ...sampleMeetingInput,
        transcript: longTranscript,
      };

      const savedMeeting = await storage.saveMeeting(input, mockKey);
      const retrievedMeeting = await storage.getMeeting(savedMeeting.id, mockKey);

      expect(retrievedMeeting?.transcript).toBe(longTranscript);
    });
  });
});
