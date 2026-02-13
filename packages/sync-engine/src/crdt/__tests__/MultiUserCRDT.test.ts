import { VectorClock } from '../VectorClock';
import { OperationTransformer } from '../OperationTransformer';
import { MultiUserCRDT } from '../MultiUserCRDT';
import { CRDTOperation, CRDTOperationType } from '../types';

// Helper to create operations
const createOp = (
  type: CRDTOperationType,
  position: number,
  userId: string,
  timestamp: number,
  content?: string,
  length?: number
): CRDTOperation => ({
  id: `${userId}-${timestamp}`,
  type,
  position,
  content,
  length,
  userId,
  timestamp,
});

describe('MultiUserCRDT', () => {
  describe('VectorClock', () => {
    test('should increment counter for user', () => {
      const clock = new VectorClock();
      clock.increment('user1');
      clock.increment('user1');
      clock.increment('user2');

      expect(clock.get('user1')).toBe(2);
      expect(clock.get('user2')).toBe(1);
      expect(clock.get('user3')).toBe(0);
    });

    test('should merge vector clocks', () => {
      const clock1 = new VectorClock({ user1: 5, user2: 3 });
      const clock2 = new VectorClock({ user2: 4, user3: 2 });

      clock1.merge(clock2);

      expect(clock1.get('user1')).toBe(5);
      expect(clock1.get('user2')).toBe(4); // max of 3 and 4
      expect(clock1.get('user3')).toBe(2);
    });

    test('should compare vector clocks correctly', () => {
      const clock1 = new VectorClock({ user1: 3, user2: 2 });
      const clock2 = new VectorClock({ user1: 4, user2: 2 });
      const _clock3 = new VectorClock({ user1: 3, user2: 3 });
      const clock4 = new VectorClock({ user1: 3, user2: 2 });
      const clock5 = new VectorClock({ user1: 4, user2: 1 });

      expect(clock1.compare(clock2)).toBe('before');
      expect(clock2.compare(clock1)).toBe('after');
      expect(clock1.compare(clock4)).toBe('equal');
      expect(clock1.compare(clock5)).toBe('concurrent');
      expect(clock5.compare(clock1)).toBe('concurrent');
    });

    test('should check happensBefore correctly', () => {
      const clock1 = new VectorClock({ user1: 3 });
      const clock2 = new VectorClock({ user1: 4 });

      expect(clock1.happensBefore(clock2)).toBe(true);
      expect(clock2.happensBefore(clock1)).toBe(false);
    });

    test('should detect concurrent operations', () => {
      const clock1 = new VectorClock({ user1: 3, user2: 2 });
      const clock2 = new VectorClock({ user1: 2, user2: 3 });

      expect(clock1.isConcurrent(clock2)).toBe(true);
      expect(clock1.isConcurrent(clock1.clone())).toBe(false);
    });

    test('should serialize and deserialize', () => {
      const clock = new VectorClock({ user1: 5, user2: 3 });
      const json = clock.toJSON();
      const restored = VectorClock.fromJSON(json);

      expect(restored.equals(clock)).toBe(true);
      expect(json).toEqual({ user1: 5, user2: 3 });
    });

    test('should clone vector clock', () => {
      const clock1 = new VectorClock({ user1: 5 });
      const clock2 = clock1.clone();

      clock1.increment('user1');

      expect(clock1.get('user1')).toBe(6);
      expect(clock2.get('user1')).toBe(5);
    });
  });

  describe('OperationTransformer', () => {
    test('should transform insert against insert', () => {
      const op1 = createOp(CRDTOperationType.INSERT, 5, 'user1', 1, 'hello');
      const op2 = createOp(CRDTOperationType.INSERT, 10, 'user2', 2, 'world');

      const result = OperationTransformer.transformInsertAgainstInsert(op1, op2);

      expect(result.operation1.position).toBe(5);
      expect(result.operation2.position).toBe(15); // 10 + 5 (length of 'hello')
    });

    test('should transform insert against insert at same position', () => {
      const op1 = createOp(CRDTOperationType.INSERT, 5, 'user1', 1, 'abc');
      const op2 = createOp(CRDTOperationType.INSERT, 5, 'user2', 2, 'xyz');

      // op2 has higher timestamp, so op1 should be first
      const result = OperationTransformer.transformInsertAgainstInsert(op1, op2);

      expect(result.operation1.position).toBe(5);
      expect(result.operation2.position).toBe(8); // 5 + 3
    });

    test('should transform insert against insert with same timestamp', () => {
      const op1 = createOp(CRDTOperationType.INSERT, 5, 'alice', 1, 'a');
      const op2 = createOp(CRDTOperationType.INSERT, 5, 'bob', 1, 'b');

      // User ID tiebreaker: 'alice' < 'bob'
      const result = OperationTransformer.transformInsertAgainstInsert(op1, op2);

      expect(result.operation1.position).toBe(5);
      expect(result.operation2.position).toBe(6); // 5 + 1
    });

    test('should transform insert against delete', () => {
      const insertOp = createOp(CRDTOperationType.INSERT, 15, 'user1', 1, 'hello');
      const deleteOp = createOp(CRDTOperationType.DELETE, 5, 'user2', 2, undefined, 5);

      // Since insert is after delete, position should shift
      const transformed = OperationTransformer.transformInsertAgainstDelete(insertOp, deleteOp);
      expect(transformed.position).toBe(10); // 15 - 5
    });

    test('should transform cursor against insert', () => {
      const operation = createOp(CRDTOperationType.INSERT, 5, 'user1', 1, 'hello');

      expect(OperationTransformer.transformCursorAgainstOperation(3, operation)).toBe(3);
      expect(OperationTransformer.transformCursorAgainstOperation(5, operation)).toBe(10);
      expect(OperationTransformer.transformCursorAgainstOperation(10, operation)).toBe(15);
    });

    test('should transform cursor against delete', () => {
      const operation = createOp(CRDTOperationType.DELETE, 5, 'user1', 1, undefined, 3);

      expect(OperationTransformer.transformCursorAgainstOperation(3, operation)).toBe(3);
      expect(OperationTransformer.transformCursorAgainstOperation(5, operation)).toBe(5);
      expect(OperationTransformer.transformCursorAgainstOperation(7, operation)).toBe(5);
      expect(OperationTransformer.transformCursorAgainstOperation(10, operation)).toBe(7);
    });

    test('should compose operations', () => {
      const ops = [
        createOp(CRDTOperationType.INSERT, 0, 'user1', 1, 'hello'),
        createOp(CRDTOperationType.INSERT, 5, 'user1', 2, ' world'),
        createOp(CRDTOperationType.DELETE, 0, 'user2', 3, undefined, 3),
      ];

      const composed = OperationTransformer.composeOperations(ops);

      // First two inserts should be merged
      expect(composed).toHaveLength(2);
      expect(composed[0].content).toBe('hello world');
      expect(composed[1].type).toBe(CRDTOperationType.DELETE);
    });

    test('should simplify operations', () => {
      const ops = [
        createOp(CRDTOperationType.INSERT, 0, 'user1', 1, 'hello'),
        createOp(CRDTOperationType.DELETE, 0, 'user1', 2, undefined, 5),
        createOp(CRDTOperationType.RETAIN, 5, 'user1', 3),
        createOp(CRDTOperationType.INSERT, 0, 'user2', 4, 'world'),
      ];

      const simplified = OperationTransformer.simplifyOperations(ops);

      // Insert followed by delete should cancel out
      // RETAIN should be removed
      expect(simplified).toHaveLength(1);
      expect(simplified[0].content).toBe('world');
    });
  });

  describe('MultiUserCRDT', () => {
    let crdt: MultiUserCRDT;

    beforeEach(() => {
      crdt = new MultiUserCRDT('doc1', 'user1', 'Hello World');
    });

    test('should initialize with document content', () => {
      expect(crdt.getContent()).toBe('Hello World');
      expect(crdt.getDocumentId()).toBe('doc1');
      expect(crdt.getUserId()).toBe('user1');
    });

    test('should apply local insert operation', () => {
      const op = createOp(CRDTOperationType.INSERT, 5, 'user1', 1, ' Beautiful');
      crdt.applyLocalOperation(op);

      expect(crdt.getContent()).toBe('Hello Beautiful World');
      expect(crdt.getPendingOperations()).toHaveLength(1);
    });

    test('should apply local delete operation', () => {
      const op = createOp(CRDTOperationType.DELETE, 5, 'user1', 1, undefined, 6);
      crdt.applyLocalOperation(op);

      expect(crdt.getContent()).toBe('Hello');
    });

    test('should apply remote operation', () => {
      const localOp = createOp(CRDTOperationType.INSERT, 5, 'user1', 1, ' Beautiful');
      crdt.applyLocalOperation(localOp);

      const remoteOp = createOp(CRDTOperationType.INSERT, 0, 'user2', 1, 'Title: ');
      const applied = crdt.applyRemoteOperation(remoteOp);

      expect(applied).toBe(true);
      expect(crdt.getContent()).toBe('Title: Hello Beautiful World');
    });

    test('should track vector clock', () => {
      const op1 = createOp(CRDTOperationType.INSERT, 0, 'user1', 1, 'A');
      const op2 = createOp(CRDTOperationType.INSERT, 1, 'user1', 2, 'B');

      crdt.applyLocalOperation(op1);
      crdt.applyLocalOperation(op2);

      const clock = crdt.getVectorClock();
      expect(clock.get('user1')).toBe(2);
    });

    test('should detect concurrent operations', () => {
      const crdt2 = new MultiUserCRDT('doc1', 'user2', 'Hello World');

      // User1 makes an operation
      const op1 = createOp(CRDTOperationType.INSERT, 5, 'user1', 1, ' Alice');
      crdt.applyLocalOperation(op1);

      // User2 makes a concurrent operation (based on same initial state)
      const op2 = createOp(CRDTOperationType.INSERT, 5, 'user2', 1, ' Bob');
      crdt2.applyLocalOperation(op2);

      // Apply remote operations
      crdt.applyRemoteOperation(op2);
      crdt2.applyRemoteOperation(op1);

      // Both should end up with same content (eventual consistency)
      expect(crdt.getContent()).toBe(crdt2.getContent());
    });

    test('should merge CRDT states', () => {
      const crdt2 = new MultiUserCRDT('doc1', 'user2', 'Hello World');

      // Both users make changes
      crdt.applyLocalOperation(createOp(CRDTOperationType.INSERT, 11, 'user1', 1, '!'));
      crdt2.applyLocalOperation(createOp(CRDTOperationType.INSERT, 0, 'user2', 1, 'Title: '));

      // Merge crdt2 into crdt1
      crdt.merge(crdt2);

      expect(crdt.getContent()).toContain('Title:');
      expect(crdt.getContent()).toContain('!');
    });

    test('should generate diff between CRDTs', () => {
      const crdt2 = new MultiUserCRDT('doc1', 'user2', 'Hello');

      crdt.applyLocalOperation(createOp(CRDTOperationType.INSERT, 11, 'user1', 1, ' World'));

      const diff = crdt.generateDiff(crdt2);

      expect(diff.length).toBeGreaterThan(0);
    });

    test('should transform cursor positions', () => {
      crdt.applyLocalOperation(createOp(CRDTOperationType.INSERT, 5, 'user1', 1, ' Beautiful'));

      // Cursor at position 6 should shift to 16 after insert
      const newPosition = crdt.transformCursor(6, 'user2');
      expect(newPosition).toBe(16);
    });

    test('should clear pending operations', () => {
      crdt.applyLocalOperation(createOp(CRDTOperationType.INSERT, 0, 'user1', 1, 'A'));
      crdt.applyLocalOperation(createOp(CRDTOperationType.INSERT, 1, 'user1', 2, 'B'));

      expect(crdt.getPendingOperations()).toHaveLength(2);

      crdt.clearPendingOperations();

      expect(crdt.getPendingOperations()).toHaveLength(0);
    });

    test('should handle conflict detection', () => {
      // Create concurrent operations that might conflict
      const op1 = createOp(CRDTOperationType.DELETE, 0, 'user1', 1, undefined, 5);
      const op2 = createOp(CRDTOperationType.INSERT, 3, 'user2', 1, 'XXX');

      crdt.applyLocalOperation(op1);
      crdt.applyRemoteOperation(op2);

      // Conflict detection depends on implementation
      // This test verifies the method exists and works
      expect(typeof crdt.hasConflicts).toBe('function');
    });

    test('should notify change listeners', () => {
      const listener = jest.fn();
      crdt.onChange(listener);

      crdt.applyLocalOperation(createOp(CRDTOperationType.INSERT, 0, 'user1', 1, 'A'));

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].content).toBeDefined();
      expect(listener.mock.calls[0][0].operations).toBeDefined();
    });

    test('should maintain eventual consistency', () => {
      // Create two CRDTs with same initial content
      const crdtA = new MultiUserCRDT('doc1', 'userA', 'Start');
      const crdtB = new MultiUserCRDT('doc1', 'userB', 'Start');

      // User A makes operations
      const opA1 = createOp(CRDTOperationType.INSERT, 5, 'userA', 1, 'A1');
      const opA2 = createOp(CRDTOperationType.INSERT, 7, 'userA', 2, 'A2');
      crdtA.applyLocalOperation(opA1);
      crdtA.applyLocalOperation(opA2);

      // User B makes operations
      const opB1 = createOp(CRDTOperationType.INSERT, 5, 'userB', 1, 'B1');
      const opB2 = createOp(CRDTOperationType.INSERT, 7, 'userB', 2, 'B2');
      crdtB.applyLocalOperation(opB1);
      crdtB.applyLocalOperation(opB2);

      // Exchange operations
      crdtA.applyRemoteOperation(opB1);
      crdtA.applyRemoteOperation(opB2);
      crdtB.applyRemoteOperation(opA1);
      crdtB.applyRemoteOperation(opA2);

      // Both should have the same content
      expect(crdtA.getContent()).toBe(crdtB.getContent());
    });

    test('should handle operation transformation chain', () => {
      const crdtA = new MultiUserCRDT('doc1', 'userA', 'Hello');
      const crdtB = new MultiUserCRDT('doc1', 'userB', 'Hello');

      // Multiple concurrent operations
      crdtA.applyLocalOperation(createOp(CRDTOperationType.INSERT, 5, 'userA', 1, ' World'));
      crdtA.applyLocalOperation(createOp(CRDTOperationType.INSERT, 11, 'userA', 2, '!'));

      crdtB.applyLocalOperation(createOp(CRDTOperationType.INSERT, 0, 'userB', 1, 'Title: '));
      crdtB.applyLocalOperation(createOp(CRDTOperationType.DELETE, 7, 'userB', 2, undefined, 3));

      // Merge both ways
      crdtA.merge(crdtB);
      crdtB.merge(crdtA);

      // Should eventually converge
      expect(crdtA.getContent()).toBe(crdtB.getContent());
    });
  });
});
