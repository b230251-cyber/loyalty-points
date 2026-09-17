import { Router } from 'express';
import { MemberService } from '../domain/memberService.js';
import { LedgerService } from '../domain/ledgerService.js';

export function createMembersRouter(memberService: MemberService, ledgerService: LedgerService): Router {
  const router = Router();

  // Search members by phone or name
  router.get('/search', (req, res) => {
    try {
      const query = (req.query.q as string || req.query.phone as string || '').trim();
      const limit = parseInt(req.query.limit as string || '15', 10);

      if (!query) {
        // Return recent members if no search query
        const recent = memberService.getAllMembers(limit);
        return res.json({ members: recent, query: '' });
      }

      const results = memberService.searchMembers(query, limit);
      return res.json({ members: results, query });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get total stats / member list
  router.get('/', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '50', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);
      const members = memberService.getAllMembers(limit, offset);
      const totalCount = memberService.getTotalMemberCount();

      return res.json({ members, totalCount, limit, offset });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Register new member
  router.post('/', (req, res) => {
    try {
      const { phoneNumber, name, email, initialPoints } = req.body;
      if (!phoneNumber || !name) {
        return res.status(400).json({ error: 'Phone number and name are required.' });
      }

      const member = memberService.registerMember({
        phoneNumber,
        name,
        email,
        initialPoints: initialPoints ? Number(initialPoints) : 0
      });

      return res.status(201).json({ member });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Get member details by ID
  router.get('/:id', (req, res) => {
    try {
      const member = memberService.getMemberById(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      return res.json({ member });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get member transaction history
  router.get('/:id/transactions', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '50', 10);
      const transactions = ledgerService.getMemberTransactions(req.params.id, limit);
      return res.json({ transactions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Reconcile member balance against ledger
  router.get('/:id/reconciliation', (req, res) => {
    try {
      const result = ledgerService.reconcileMemberBalance(req.params.id);
      return res.json({ reconciliation: result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
