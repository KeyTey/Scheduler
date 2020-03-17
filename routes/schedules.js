'use strict';

const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const User = require('../models/user');
const Availability = require('../models/availability');
const Comment = require('../models/comment');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

router.get('/new', authenticationEnsurer, csrfProtection, (req, res, next) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const scheduleId = uuid.v4();
  const updatedAt = new Date();
  Schedule.create({
    scheduleId: scheduleId,
    scheduleName: req.body.scheduleName.slice(0, 255) || '（名称未設定）',
    memo: req.body.memo.slice(0, 1000),
    createdBy: req.user.id,
    updatedAt: updatedAt
  }).then((schedule) => {
    createCandidatesAndRedirect(parseCandidateNames(req), scheduleId, res);
  });
});

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
  let storedSchedule = null;
  let storedCandidates = null;
  Schedule.findOne({
    include: [{
      model: User,
      attributes: ['userId', 'username']
    }],
    where: { scheduleId: req.params.scheduleId },
    order: [['"updatedAt"', 'DESC']]
  }).then((schedule) => {
    if (schedule) {
      storedSchedule = schedule;
      return Candidate.findAll({
        where: { scheduleId: schedule.scheduleId },
        order: [['"candidateId"', 'ASC']]
      });
    }
    else {
      const err = new Error('指定された予定は見つかりません');
      err.status = 404;
      next(err);
    }
  }).then((candidates) => {
    // データベースからその予定の全ての出欠を取得する
    storedCandidates = candidates;
    return Availability.findAll({
      include: [{
        model: User,
        attributes: ['userId', 'username']
      }],
      where: { scheduleId: storedSchedule.scheduleId },
      order: [[User, 'username', 'ASC'], ['"candidateId"', 'ASC']]
    });
  }).then((availabilities) => {
    // 出欠 MapMap {ユーザーID: 出欠 Map {候補ID: 出欠}} を作成する
    const availabilityMapMap = new Map(); // {userId: Map {candidateId: availability}}
    availabilities.forEach((availability) => {
      const map = availabilityMapMap.get(availability.user.userId) || new Map();
      map.set(availability.candidateId, availability.availability);
      availabilityMapMap.set(availability.user.userId, map);
    });
    // ユーザー Map {ユーザーID: ユーザー} を作成する
    const userMap = new Map(); // {userId: User}
    userMap.set(parseInt(req.user.id), {
      isSelf: true,
      userId: parseInt(req.user.id),
      username: req.user.username
    });
    availabilities.forEach((availability) => {
      userMap.set(availability.user.userId, {
        isSelf: parseInt(req.user.id) === availability.user.userId, // 閲覧ユーザー自身であるかどうか
        userId: availability.user.userId,
        username: availability.user.username
      });
    });
    // 全ユーザー、全候補で二重ループしてそれぞれの出欠の値がない場合には「欠席」を設定する
    const users = Array.from(userMap).map((keyValue) => keyValue[1]);
    users.forEach((user) => {
      storedCandidates.forEach((candidate) => {
        const map = availabilityMapMap.get(user.userId) || new Map();
        const availability = map.get(candidate.candidateId) || 0; // デフォルト値は 0 を利用
        map.set(candidate.candidateId, availability);
        availabilityMapMap.set(user.userId, map);
      });
    });
    // コメント取得
    Comment.findAll({
      where: { scheduleId: storedSchedule.scheduleId }
    }).then((comments) => {
      const commentMap = new Map();  // {userId: comment}
      comments.forEach((comment) => {
        commentMap.set(comment.userId, comment.comment);
      });
      res.render('schedule', {
        user: req.user,
        schedule: storedSchedule,
        candidates: storedCandidates,
        users: users,
        availabilityMapMap: availabilityMapMap,
        commentMap: commentMap
      });
    });
  });
});

router.get('/:scheduleId/edit', authenticationEnsurer, csrfProtection, (req, res, next) => {
  Schedule.findOne({
    where: { scheduleId: req.params.scheduleId }
  }).then((schedule) => {
    // 作成者のみが編集フォームを開ける
    if (isMine(req, schedule)) {
      Candidate.findAll({
        where: { scheduleId: schedule.scheduleId },
        order: [['"candidateId"', 'ASC']]
      }).then((candidates) => {
        res.render('edit', {
          user: req.user,
          schedule: schedule,
          candidates: candidates,
          csrfToken: req.csrfToken()
        });
      });
    }
    else {
      const err = new Error('指定された予定がない、または予定する権限がありません');
      err.status = 404;
      next(err);
    }
  });
});

function isMine(req, schedule) {
  return schedule && parseInt(schedule.createdBy) === parseInt(req.user.id);
}

router.post('/:scheduleId', authenticationEnsurer, csrfProtection, (req, res, next) => {
  Schedule.findOne({
    where: { scheduleId: req.params.scheduleId }
  }).then((schedule) => {
    if (!isMine(req, schedule)) {
      const err = new Error('指定された予定がない、または編集する権限がありません');
      err.status = 404;
      next(err);
      return;
    }
    if (parseInt(req.query.edit) === 1) {
      const updatedAt = new Date();
      schedule.update({
        scheduleId: schedule.scheduleId,
        scheduleName: req.body.scheduleName.slice(0, 255) || '（名称未設定）',
        memo: req.body.memo,
        createdBy: req.user.id,
        updatedAt: updatedAt
      }).then((schedule) => {
        // 候補が追加されているかどうか
        const candidateNames = parseCandidateNames(req);
        if (candidateNames) {
          createCandidatesAndRedirect(candidateNames, schedule.scheduleId, res);
        }
        else {
          res.redirect('/schedules/' + schedule.scheduleId);
        }
      });
    }
    else if (parseInt(req.query.delete) === 1) {
      deleteScheduleAggregate(req.params.scheduleId, () => res.redirect('/'));
    }
    else {
      const err = new Error('不正なリクエストです');
      err.status = 400;
      next(err);
    }
  });
});

function deleteScheduleAggregate(scheduleId, done, err) {
  Availability.findAll({
    where: { scheduleId: scheduleId }
  }).then((availabilities) => {
    // 出欠を削除する
    const promises = availabilities.map(availability => availability.destroy());
    return Promise.all(promises);
  }).then(() => {
    return Comment.findAll({ where: { scheduleId: scheduleId } });
  }).then((comments) => {
    // コメントを削除する
    const promises = comments.map(comment => comment.destroy());
    return Promise.all(promises);
  }).then(() => {
    return Candidate.findAll({ where: { scheduleId: scheduleId } });
  }).then((candidates) => {
    // 候補を削除する
    const promises = candidates.map(candidate => candidate.destroy());
    return Promise.all(promises);
  }).then(() => {
    // 予定を削除する
    return Schedule.findByPk(scheduleId).then(schedule => schedule.destroy());
  }).then(() => {
    if (err) return done(err);
    done();
  });
}

router.deleteScheduleAggregate = deleteScheduleAggregate;

function createCandidatesAndRedirect(candidateNames, scheduleId, res) {
  const candidates = candidateNames.map(name => ({
    candidateName: name,
    scheduleId: scheduleId
  }));
  Candidate.bulkCreate(candidates).then(() => {
    res.redirect('/schedules/' + scheduleId);
  });
}

function parseCandidateNames(req) {
  return req.body.candidates.trim().split('\n').map(s => s.trim()).filter(s => s !== '');
}

module.exports = router;
