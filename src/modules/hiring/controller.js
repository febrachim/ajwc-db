import { Hiring } from './model/hiring';
import { People } from '../people/model/people';
import { Company } from '../company/model/company';
import { HiringStatus, HiringStatusType, OpenStatus } from '../master/model/hiring_status';
import { Category, CategoryType } from '../master/model/category';
import { Note } from '../desc/model/note';
import { Document } from '../desc/model/document';
import { capitalize, error, errorJSON, formatDate, genReport } from '../core/utils';
import { Messages } from './messages';

const { hiringMsg, candidateMsg } = Messages;

export const HiringController = {};
export default { HiringController };

// Create 2 pages here, one when adding notes for hiring, and other candidates

HiringController.addOpeningView = async (req, res) => {
  const { company, position = '', type } = req.query;
  const getWithoutCandidate = !company ? undefined
    : Hiring.get({ company_id: company, position, people_id: null }).then(result => result && result.get('id'));
  const getCompany = !company ? undefined
    : Company.get({ id: company }).then(result => result.serialize({ api: true }));
  const getHiringStatuses = HiringStatus.getAll({ type: HiringStatusType.HIRING });
  const getCandidateStatuses = HiringStatus.getAll({ type: HiringStatusType.CANDIDATE });
  const [hiring, candidate, hiringId, selectedCompany] = await Promise
    .all([getHiringStatuses, getCandidateStatuses, getWithoutCandidate, getCompany]);
  res.render('hiring/views/createOpening', { link: '/hirings',
    type: 'add',
    pageType: type,
    hiring_statuses: hiring.serialize(),
    candidate_statuses: candidate.serialize(),
    hiringId,
    company: selectedCompany,
    position,
  });
};

HiringController.addOpening = async (req, res, next) => {
  const { company, hiring_status, candidate_status,
    candidate, notes = [], hiring_id: id, type } = req.body;

  console.log(req.body)
  const position = capitalize(req.body.position);

  if (position) {
    const getCheck = Hiring.get({ people_id: candidate || null, position, company_id: company });
    const getPosStatus = Hiring.getPositionStatus(position, company);
    const [check, status] = await Promise.all([getCheck, getPosStatus]);
    if (check) return next(errorJSON('danger', hiringMsg.create_duplicate));
    if (status === OpenStatus.CLOSED) return next(errorJSON('danger', hiringMsg.position_closed));
  }

  const data = {
    company_id: company,
    position,
    position_hiring_status_id: hiring_status,
    candidate_hiring_status_id: candidate_status,
    people_id: candidate,
    user_id: req.user.id };

  if (id) data.id = id;

  const hiring = await Hiring.forge(data).save();

  const updateStatus = Hiring.updatePositionStatus(position, company, hiring_status);

  let insertNotes;

  if (type === 'candidates') {
    insertNotes = notes.map(note => Note.forge({
      text: note,
      ref_id: hiring.get('id'),
      ref_type: 'hirings',
      user_id: req.user.id,
    }).save());
    req.resData = {
      input: {
        ref_id: hiring.get('id'),
        ref_type: 'hirings',
        msg: hiringMsg.create_success,
        redirect: `/candidates?company=${company}&positions[]=${position}`,
      },
      link: '/upload' };
  } else {
    insertNotes = notes.map(note => Note.forge({
      text: note,
      ref_id: null,
      ref_type: `openings|${position}`,
      user_id: req.user.id,
    }).save());
    req.resData = {
      input: {
        ref_id: null,
        ref_type: `openings|${position}`,
        msg: hiringMsg.create_success,
        redirect: '/hirings',
      },
      link: '/upload' };
  }
  await Promise.all([...insertNotes, updateStatus]);
  return next();
};

HiringController.editCandidateView = async (req, res, next) => {
  const getHiring = await Hiring.get({ id: req.params.id }, ['company', 'people',
    'hiringStatus',
    'candidateStatus',
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);
  const getHiringStatuses = HiringStatus.getAll({ type: HiringStatusType.HIRING });
  const getCandidateStatuses = HiringStatus.getAll({ type: HiringStatusType.CANDIDATE });
  const [hiring, hiringStat, candidate] = await Promise
    .all([getHiring, getHiringStatuses, getCandidateStatuses]);
  if (!hiring) return next(error('danger', hiringMsg.not_found, '/hirings'));
  res.render('hiring/views/createOpening', {
    link: '/candidates',
    type: 'edit',
    notes: hiring.related('notes').serialize(),
    documents: hiring.related('documents').serialize(),
    hiring_statuses: hiringStat.serialize(),
    candidate_statuses: candidate.serialize(),
    hiring: hiring.serialize(),
  });
};

HiringController.editCandidate = async (req, res, next) => {
  const {
    hiring_status,
    candidate_status,
    candidate,
    notes = [],
    deletedNote = [],
    deletedDoc = [],
    editedNote = [] } = req.body;
  const getUpdateNote = Note.get({ user_id: null, ref_id: req.params.id, ref_type: 'hirings' });
  const getStatus = HiringStatus.get({ id: candidate_status });
  const getHiring = Hiring.get({ id: req.params.id }, ['candidateStatus']);
  const [hiring, updateNote, candidateStatus] = await Promise
    .all([getHiring, getUpdateNote, getStatus]);
  if (!hiring) return next(errorJSON('danger', hiringMsg.not_found, '/hirings'));
  // Log candidate status change
  if (!updateNote && hiring.get('candidate_hiring_status_id') !== candidateStatus.get('id')) {
    notes.push({
      text: `<p>Status updated from ${hiring.related('candidateStatus').get('name')} to <b>${candidateStatus.get('name')}</b> on ${formatDate(new Date())} by ${req.user.initial}</p>`,
      updateNote: true,
    });
  } else if (updateNote && hiring.get('candidate_hiring_status_id') !== candidateStatus.get('id')) {
    editedNote.push({
      id: updateNote.get('id'),
      updateNote: true,
      text: `<p>Status updated from ${hiring.related('candidateStatus').get('name')} to <b>${candidateStatus.get('name')}</b> on ${formatDate(new Date())} by ${req.user.initial}</p>${updateNote.get('text')}`,
    });
  }
  const insertNotes = notes.map(note => Note.forge({
    text: note.text || note,
    ref_id: hiring.get('id'),
    ref_type: 'hirings',
    user_id: !note.updateNote ? req.user.id : null,
  }).save());
  const deleteNotes = deletedNote.map(id => Note.softDelete(id, req.user.id));
  // const deleteFiles = [];
  const deleteDocs = deletedDoc.map(doc => Document.softDelete(doc, req.user.id));
  const editNotes = editedNote.map((note) => {
    if (note.updateNote) return Note.edit(note, null);
    return Note.edit(note, req.user.id);
  });
  const updateHiring = Hiring.where({ id: req.params.id }).save({
    position_hiring_status_id: hiring_status,
    candidate_hiring_status_id: candidate_status,
    people_id: candidate,
    user_id: req.user.id }, { patch: true });
  await Promise.all([
    ...insertNotes,
    ...editNotes,
    ...deleteNotes,
    ...deleteDocs,
    // ...deleteFiles,
    updateHiring]);
  req.resData = {
    input: {
      ref_id: hiring.get('id'),
      ref_type: 'hirings',
      msg: hiringMsg.edit_success,
      redirect: '/hirings',
    },
    link: '/upload' };
  return next();
};

HiringController.editHiringView = async (req, res, next) => {
  const { id, position = '' } = req.query;
  if (!id) return next(error('danger', hiringMsg.not_found, '/hirings'));
  const getHiring = await Hiring.get({ company_id: id, position }, ['company', 'hiringStatus']);
  const getHiringStatuses = HiringStatus.getAll({ type: HiringStatusType.HIRING });
  const getNotes = Note.getAll({ ref_type: `openings|${position}` }, ['createdBy']);
  const getDocuments = Document.getAll({ ref_type: `openings|${position}` }, ['createdBy']);
  const [hiring, hiringStat, notes, documents] = await Promise
    .all([getHiring, getHiringStatuses, getNotes, getDocuments]);
  if (!hiring) return next(error('danger', hiringMsg.not_found, '/hirings'));
  res.render('hiring/views/editHiring', {
    link: '/hirings',
    type: 'edit',
    notes: notes.serialize(),
    documents: documents.serialize(),
    hiring_statuses: hiringStat.serialize(),
    hiring: hiring.serialize(),
    past: { id, position },
  });
};

HiringController.editHiring = async (req, res, next) => {
  const { company,
    hiring_status,
    past,
    notes = [],
    deletedNote = [],
    deletedDoc = [],
    editedNote = [] } = req.body;

  const position = capitalize(req.body.position);

  const hiring = await Hiring.get({ company_id: past.id, position: past.position });
  if (!hiring) return next(errorJSON('danger', hiringMsg.not_found, '/hirings'));
  const updateHiring = Hiring.where({
    company_id: past.id,
    position: past.position,
    deleted_at: null,
  }).save({
    company_id: company,
    position,
    position_hiring_status_id: hiring_status,
    user_id: req.user.id,
  }, { patch: true });
  const insertNotes = notes.map(note => Note.forge({
    text: note,
    ref_id: null,
    ref_type: `openings|${position}`,
    user_id: req.user.id,
  }).save());
  const deleteNotes = deletedNote.map(id => Note.softDelete(id, req.user.id));
  // const deleteFiles = [];
  const deleteDocs = deletedDoc.map(doc => Document.softDelete(doc, req.user.id));
  const editNotes = editedNote.map(note => Note.edit(note, req.user.id));
  const existNote = await Note.where('ref_type', `openings|${past.position}`).count('id')
  if (existNote) {
    Note.where('ref_type', `openings|${past.position}`).save({ ref_type: `openings|${position}` }, { patch: true });
  }
  const isExist = await Document.where('ref_type', `openings|${past.position}`).count('id')
  if (isExist) {
    Document.where('ref_type', `openings|${past.position}`).save({ ref_type: `openings|${position}` }, { patch: true });
  }

  await Promise.all([
    ...insertNotes,
    ...editNotes,
    ...deleteNotes,
    ...deleteDocs,
    updateHiring]);
  req.resData = {
    input: {
      ref_id: null,
      ref_type: `openings|${position}`,
      msg: hiringMsg.edit_success,
      redirect: '/hirings',
    },
    link: '/upload' };
  return next();
};

HiringController.detailOpening = async (req, res, next) => {
  const { id, position = '' } = req.query;
  if (!id || !position) return next(error('danger', hiringMsg.not_found, '/hirings'));
  const getOpening = Hiring.getDetailOpening(id, position);

  const page = 1;
  const pageSize = 10;

  let candidateQuery = { company: req.query.id, positions: [ req.query.position ] }
  const getCandidates = Hiring.getCandidates(candidateQuery, { page, pageSize }, ['createdBy', 'candidateStatus',
  { 'people.peopleCompany': qb => qb.where('deleted_at', null).orderBy('status').orderBy('id', 'desc') },
  'people.peopleCompany.company', 'people.peopleCompany.role']);

  const getNotes = Note.getAll({ ref_type: `openings|${position}` }, ['createdBy']);

  const getDocuments = Document.getAll({ ref_type: `openings|${position}` }, { withRelated: ['createdBy'] });

  const [opening, notes, documents, candidate] = await Promise.all([
    getOpening,
    getNotes,
    getDocuments,
    getCandidates
  ]);

  // JSON.stringify(candidate)

  if (!opening) return next(error('danger', hiringMsg.not_found, '/hirings'));
  res.render('hiring/views/detailOpening', {
    linkCandidate: '/candidates',
    link: '/hirings',
    notes: notes.serialize(),
    documents: documents.serialize(),
    opening: opening.serialize({ job: true }),
    candidates: candidate.serialize()
  });
};

HiringController.detailCandidate = async (req, res, next) => {
  const candidate = await Hiring.get({ id: req.params.id }, ['people', 'candidateStatus', 'company',
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);
  if (!candidate) return next(error('danger', candidateMsg.not_found, '/candidates'));
  res.render('hiring/views/detailCandidate', {
    link: '/candidates',
    notes: candidate.related('notes').serialize(),
    documents: candidate.related('documents').serialize(),
    candidate: candidate.serialize(),
  });
};

HiringController.viewAllOpenings = async (req, res) => {
  const { page = 1, pageSize = 10, sort, order, candidate } = req.query;
  // console.log(req.query)
  const getOpenings = Hiring.getOpenings(req.query, { page, pageSize }, ['company', 'hiringStatus', 'createdBy']);
  const getPosition = Hiring.getAllPositions();
  const getStatuses = HiringStatus.getAll({ type: HiringStatusType.HIRING });

  const getCandidate = !candidate ? undefined
    : People.get({ id: candidate }).then(result => result.serialize({ api: true }));

  const getCount = Hiring.getOpeningCount(req.query, pageSize);
  const [openings, statuses, theCand, count, position] = await Promise
  .all([getOpenings, getStatuses, getCandidate, getCount, getPosition]);

  const roles_serialize = position.serialize({ api: true });
  const sorted_roles_data = roles_serialize.map(data => data.text).slice().sort();
  // get rid of duplicates
  const roles = sorted_roles_data.reduce((acc, el, i, arr) => {
    if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc;
  }, []);
  res.render('hiring/views/viewOpening', {
    link: '/hirings',
    linkCompanies: '/companies',
    items: openings.serialize({ job: true }),
    title: 'Hiring',
    queries: req.query,
    ...openings.pagination,
    ...count,
    statuses: statuses.serialize(),
    candidate: theCand,
    roles: roles,
    sort,
    order,
  });
};

HiringController.getAllRoles = async (req, res, next) => {
  const getPosition = Hiring.getAllPositions();
  const [openings] = await Promise.all([getPosition]);
  let dataSerialize = openings.serialize();
  const sorted_data = dataSerialize.map(data => data.position).slice().sort();
  // get rid of duplicates
  var data = sorted_data.reduce((acc, el, i, arr) => {
    if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc;
  }, []);
  req.resData = { data };
  return next();
}

HiringController.viewAllCandidates = async (req, res) => {
  const { page = 1, pageSize = 10, sort, order,
    company, positions = [], work, candidate } = req.query;

  const getCandidates = Hiring.getCandidates(req.query, { page, pageSize }, ['createdBy', 'candidateStatus',
    { 'people.peopleCompany': qb => qb.where('deleted_at', null).orderBy('status').orderBy('id', 'desc') },
    'people.peopleCompany.company', 'people.peopleCompany.role']);

  const getStatuses = HiringStatus.getAll({ type: HiringStatusType.CANDIDATE });
  const getCompany = company ? Company.get({ id: company })
    .then(result => result.serialize({ api: true })) : undefined;

  const getWork = work ? Company.get({ id: work })
    .then(result => result.serialize({ api: true })) : undefined;

  const getRoles = Category.getDropdown(CategoryType.ROLE);

  const getCandidate = !candidate ? undefined
    : People.get({ id: candidate }).then(result => result.serialize({ api: true }));

  const [candidates, statuses, theCompany, roles, theWork, theCand] = await Promise
    .all([getCandidates, getStatuses, getCompany, getRoles, getWork, getCandidate]);

    return res.render('hiring/views/viewCandidate', {
    link: '/candidates',
    items: candidates.serialize(),
    title: 'Candidate',
    queries: req.query,
    ...candidates.pagination,
    statuses: statuses.serialize(),
    company: theCompany,
    work: theWork,
    candidate: theCand,
    positions,
    sort,
    order,
    roles,
  });
};

HiringController.openingExport = async (req, res) => {
  req.query.type = 'export';
  const openings = await Hiring.getOpeningExports(['company', 'candidateStatus', 'people', 'createdBy']);
  const data = Hiring.formatExport(openings.serialize({ jobExport: true, forExport: true })
  .map(opening => ({
    ...opening,
  })), 'openings');
  const cols = ['Company', 'Position', 'Candidate', 'Status', 'Created At', 'Edited At', 'Last Edited By', 'Notes', 'Documents'];
  const name = 'Hiring List - Opening Page';
  res.attachment(`${name.toLowerCase()}.xlsx`);
  return res.send(genReport(data, cols, name));
};

HiringController.candidateExport = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const candidates = await Hiring.getCandidates(req.query, { page, pageSize }, [
    'createdBy', 'candidateStatus', 'company', 'people.country', 'hiringStatus',
    { 'people.peopleCompany': qb => qb.where('deleted_at', null).orderBy('status').orderBy('id', 'desc') },
    'people.peopleCompany.company', 'people.peopleCompany.role.parent',
    { notes: qb => qb.where('deleted_at', null).orderBy('user_id').orderBy('id', 'desc') },
    { documents: qb => qb.where('deleted_at', null) }]);
  const cols = ['Name', 'Email', 'Contact', 'Country', 'Company', 'Position', 'Position Status', 'Candidate Status', 'Work', 'Role', 'Title', 'Created At', 'Edited At', 'Last Edited By', 'Notes', 'Documents'];
  const data = Hiring.formatExport(candidates.serialize({ forExport: true }), 'candidates');
  const name = `Candidates Page ${page}`;
  res.attachment(`${name.toLowerCase()}.xlsx`);
  return res.send(genReport(data, cols, name));
};

HiringController.listJobs = async (req, res, next) => {
  const companyId = req.params.id;
  const jobs = await Hiring.getPositions(companyId);
  req.resData = { data: jobs.serialize({ jobApi: true }) };
  return next();
};

HiringController.deleteOpening = async (req, res, next) => {
  const { id, position } = req.query;
  if (!id || !position) return next(error('danger', hiringMsg.not_found, '/hirings'));
  await Hiring.where({ company_id: id, position })
    .save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', hiringMsg.delete_success);
  return res.redirect('/hirings');
};

HiringController.deleteCandidate = async (req, res) => {
  const { id } = req.params;
  await Hiring.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', candidateMsg.delete_success);
  return res.redirect('/candidates');
};
