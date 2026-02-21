// ===================================================
// HVAC Pulse — TXV Troubleshooting Wizard
// Copyright (c) 2024-2026. All rights reserved.
// Sporlan Bulletin 10-143: 12 Solutions
// Step-by-step decision tree
// ===================================================

const TXVWizard = (() => {

  // --- Step definitions ---
  const STARVING_STEPS = [
    {
      id: 1,
      title: '#1 TEV 조정 확인',
      desc: '밸브의 과열도 설정이 올바른지 확인합니다. 공장 설정은 보통 중간 위치(center stem)입니다.',
      instructions: [
        '전좌(Full CW) → 후좌(Full CCW) 총 회전수를 센다',
        '50% 지점으로 설정한다',
        '반시계 방향으로 1/2~1회전씩 조정',
        '15분 간격으로 재측정하며 올바른 과열도까지 조정'
      ],
      tip: '절대 한번에 많이 돌리지 마세요. 1/2회전 단위로, 15분 대기 후 재측정이 원칙입니다. TXV는 반응이 느립니다.'
    },
    {
      id: 2,
      title: '#2 센싱 벌브 위치 확인',
      desc: '센싱 벌브가 올바른 위치에 단단히 고정되어 있는지 확인합니다.',
      instructions: [
        '증발기 출구의 수평 석션라인에 장착되어야 함',
        '7/8" 이상 라인: 4시 또는 8시 방향',
        '바닥(6시 방향) 절대 금지 — 오일 영향',
        '깨끗하고 직선인 부분에 밀착 고정',
        '센싱벌브 반드시 단열 처리'
      ],
      tip: '센싱벌브가 느슨하거나 단열이 안 되어 있으면 주변 온도를 감지하여 TXV가 오작동합니다. 가장 흔한 설치 실수입니다.'
    },
    {
      id: 3,
      title: '#3 수분(Moisture) 확인',
      desc: '밸브 내부에 수분이 얼어 냉매 흐름을 방해할 수 있습니다.',
      instructions: [
        'TXV가 시스템에서 첫 번째 저온 지점 → 수분이 여기서 먼저 어름',
        '밸브 본체에 뜨거운 물 한 컵 부어 테스트',
        '냉매 흐름 소리가 급증하면 = 수분 확인',
        '새 Catch-All 필터-드라이어 설치'
      ],
      tip: '시스템을 수년간 안 열었어도 수분 문제 가능합니다. 리퀴드라인 드라이어가 수분 보유 한계에 도달하면 온도 상승 시 수분을 방출합니다.'
    },
    {
      id: 4,
      title: '#4 밸브 내부 오염물 확인',
      desc: '구리 산화물, 금속 조각, 슬러지 등이 밸브 오리피스를 막을 수 있습니다.',
      instructions: [
        '펌프다운 실시',
        'TXV 분해하여 내부 청소',
        '오염물 확인 후 새 필터-드라이어 설치',
        '오염물 없으면 사이트글라스 설치 후 #5로'
      ],
      tip: '특히 컴프레서 교체 이력이 있는 시스템에서 자주 발생합니다. 일반 스트레이너는 미세 오염물을 통과시킵니다.'
    },
    {
      id: 5,
      title: '#5 TEV 입구 액체 상태 확인',
      desc: '리퀴드라인에 플래시가스(기포)가 없는 순수 액체가 공급되는지 확인합니다.',
      instructions: [
        '사이트글라스에서 기포 확인',
        '기포 있으면 = 플래시가스 → TXV 용량 저하',
        '배관 크기, 수직 리프트, 압력 강하 확인',
        '필요시 열교환기 설치로 과냉도 확보'
      ],
      tip: '리퀴드라인에 기포가 보인다고 반드시 냉매 부족이 아닙니다. 배관 압력 강하(긴 배관, 수직 리프트)로도 발생할 수 있습니다.'
    },
    {
      id: 6,
      title: '#6 TEV 용량(설계 압력강하) 확인',
      desc: 'TEV의 실제 용량이 시스템 조건에 맞는지 확인합니다.',
      instructions: [
        '밸브 전후 실제 압력차 측정',
        '입구 압력 손실 또는 출구 압력 상승 원인 제거',
        '저응축 압력 시 → 헤드 프레셔 컨트롤 설치 고려',
        '더 큰 TEV 설치는 최후의 수단'
      ],
      tip: '겨울철 저부하 시 응축압력이 낮아지면 TXV 전후 압력차가 줄어 용량 부족이 될 수 있습니다. 헤드 프레셔 컨트롤로 해결 가능합니다.'
    },
    {
      id: 7,
      title: '#7 차지 마이그레이션 확인',
      desc: '센싱 엘리먼트의 충전물이 밸브 쪽으로 이동하여 밸브가 닫히는 현상입니다.',
      instructions: [
        '벌브 온도가 엘리먼트 온도보다 낮아야 정상',
        '반대가 되면 충전물이 이동 → 밸브 닫힘',
        '열풍기로 엘리먼트를 가열하여 복원',
        '로즈버드 토치(직화) 절대 금지!'
      ],
      tip: '이 문제는 가스형 차지(ZP, CP, VGA) TXV에서 발생합니다. 밸브 본체가 엘리먼트보다 차가우면 정상이지만, 반대가 되면 조치가 필요합니다.'
    }
  ];

  const FLOODING_STEPS = [
    {
      id: 8,
      title: '#8 TEV 조정 확인 (과냉 방향)',
      desc: '밸브를 닫는 방향으로 조정하여 과열도를 올립니다.',
      instructions: [
        '시계 방향으로 1/2~1회전씩 조정',
        '15분 간격으로 재측정',
        '올바른 과열도(보통 10°F ±5)까지 조정',
        '컴프레서 흡입에서 리퀴드백 없는지 확인'
      ],
      tip: '조정 후에는 반드시 15분 이상 대기하세요. TXV는 반응 속도가 느리므로 성급한 추가 조정은 오히려 상황을 악화시킵니다.'
    },
    {
      id: 9,
      title: '#9 리퀴드라인 상태 변화 확인',
      desc: '플래시가스 보상으로 과도 개방된 밸브가, 조건 변화 시 플러딩을 유발할 수 있습니다.',
      instructions: [
        '사이트글라스에서 상태 변화 관찰',
        '응축온도 하락 시 → 순수 액체 공급 → 기존 개도에서 플러딩',
        '부하 감소 시에도 동일 현상 발생 가능',
        '조건 변화에 따른 재조정 필요'
      ],
      tip: '밤/낮 온도차가 큰 환경에서 자주 발생합니다. 낮에는 정상이지만 밤에 외기온도가 떨어지면 플러딩이 시작될 수 있습니다.'
    },
    {
      id: 10,
      title: '#10 헌팅 패턴 확인',
      desc: '과열도가 0°F ↔ 10°F+ 사이를 반복하는 헌팅(hunting) 현상입니다.',
      instructions: [
        '과열도를 수분 간격으로 기록하여 진동 패턴 확인',
        '심한 헌팅 확인 시 → 반직관적 해결법 적용',
        '조정 스프링을 느슨하게 (개방 방향으로)',
        '더 많은 유량 → 더 안정적인 피딩 → 헌팅 감소'
      ],
      tip: '직관에 반대되지만, 밸브를 약간 더 열면 헌팅이 줄어듭니다. 유량이 증가하면 증발기 내 압력/온도가 안정화되어 TXV가 덜 헌팅합니다.'
    },
    {
      id: 11,
      title: '#11 에어플로우/열부하 확인',
      desc: '증발기 측 공기 순환이 부족하면 열전달 손실로 TXV가 과잉 공급합니다.',
      instructions: [
        '에어필터 상태 확인 (ABC 원칙!)',
        '증발기 코일 청결도 점검',
        '팬 모터 작동 및 풍속 확인',
        '먼지, 얼음, 판금 패널 탈락, 제품 적재 상태 확인',
        'Walk-in: 공기순환 횟수 확인'
      ],
      tip: '"Airflow Before Charge" — 95%의 경우 게이지 연결 전에 에어플로우 문제를 먼저 해결하면 됩니다.'
    },
    {
      id: 12,
      title: '#12 불균등 증발기 회로 부하',
      desc: '멀티회로 증발기에서 각 회로의 열부하가 달라지면 불균등 문제가 발생합니다.',
      instructions: [
        '각 디스트리뷰터 회로 석션 출구 온도 비교',
        '온도 차이가 크면 = 불균등 부하',
        '저부하 회로 → 리퀴드 넘침 → 석션 온도↓ → TXV 쓰로틀',
        '정상 부하 회로 → 냉매 부족 → 냉각 손실'
      ],
      tip: '멀티회로 증발기에서 각 회로 출구 온도를 비교하세요. 차이가 5°F 이상이면 디스트리뷰터/노즐 어셈블리를 확인해야 합니다.'
    }
  ];

  // State
  let currentMode = null; // 'starving' | 'flooding'
  let currentStepIndex = 0;

  // =============================================
  // UI Logic
  // =============================================
  function initUI() {
    renderInitialScreen();
  }

  function renderInitialScreen() {
    const container = document.getElementById('txv-content');
    if (!container) return;

    currentMode = null;
    currentStepIndex = 0;

    container.innerHTML = `
      <div class="page-header">
        <h1>${t('txv.title', 'TXV 트러블슈팅 마법사')}</h1>
        <p class="subtitle">${t('txv.subtitle', 'Sporlan 공식 12단계 기반')}</p>
      </div>

      <div class="glass-card" style="text-align:center">
        <p style="color:var(--text-secondary);margin-bottom:24px">
          ${t('txv.question', 'TXV(열팽창밸브)에서 어떤 증상이 나타나고 있나요?')}
        </p>

        <div class="wizard-choice">
          <button class="choice-btn choice-btn--danger" onclick="TXVWizard.startMode('starving')">
            <span class="choice-icon">🔥</span>
            <span>${t('txv.starving', '스타빙 (Starving)')}</span>
            <span class="choice-desc">${t('txv.starving_desc', '과열도가 높음 — 냉매 공급 부족')}</span>
          </button>
          <button class="choice-btn choice-btn--info" onclick="TXVWizard.startMode('flooding')">
            <span class="choice-icon">💧</span>
            <span>${t('txv.flooding', '플러딩 (Flooding)')}</span>
            <span class="choice-desc">${t('txv.flooding_desc', '과열도가 낮음 — 냉매 과다 공급')}</span>
          </button>
        </div>
      </div>

      <div class="alert-box alert-info">
        ${App.statusSvg('info')}
        <span>${t('txv.measure_hint', '과열도를 먼저 측정하세요. 정상 범위(5~15°F)보다 높으면 스타빙, 낮으면 플러딩입니다.')}</span>
      </div>`;
  }

  function startMode(mode) {
    currentMode = mode;
    currentStepIndex = 0;
    renderStep();
  }

  function renderStep() {
    const container = document.getElementById('txv-content');
    if (!container) return;

    const steps = currentMode === 'starving' ? STARVING_STEPS : FLOODING_STEPS;
    const step = steps[currentStepIndex];
    const totalSteps = steps.length;
    const modeLabel = currentMode === 'starving' ? t('txv.starving_path', '스타빙 경로') : t('txv.flooding_path', '플러딩 경로');
    const modeIcon = currentMode === 'starving' ? '🔥' : '💧';

    // Progress dots
    let progressHtml = '<div class="wizard-progress">';
    for (let i = 0; i < totalSteps; i++) {
      const cls = i < currentStepIndex ? 'completed' : i === currentStepIndex ? 'active' : '';
      progressHtml += `<div class="step-dot ${cls}"></div>`;
    }
    progressHtml += '</div>';

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <button class="btn btn-sm btn-secondary" onclick="TXVWizard.goBack()" style="width:auto;padding:8px 12px">
          ← ${t('common.back', '뒤로')}
        </button>
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">${modeIcon} ${modeLabel}</span>
      </div>

      ${progressHtml}

      <div class="glass-card wizard-step animate-slide-up">
        <div class="step-number">${t('txv.step.label', 'STEP')} ${currentStepIndex + 1} / ${totalSteps}</div>
        <div class="step-title">${t(`txv.step${step.id}.title`, step.title)}</div>
        <div class="step-desc">${t(`txv.step${step.id}.desc`, step.desc)}</div>

        <div style="text-align:left;margin-bottom:16px">
          <strong style="font-size:var(--text-sm);color:var(--text-primary)">${t('txv.check_items', '확인 사항')}:</strong>
          <ul style="margin:8px 0 0 16px;font-size:var(--text-sm);color:var(--text-secondary);line-height:1.8">
            ${step.instructions.map((instr, idx) => `<li>${t(`txv.step${step.id}.instr${idx+1}`, instr)}</li>`).join('')}
          </ul>
        </div>

        <div class="step-tip">${t(`txv.step${step.id}.tip`, step.tip)}</div>

        <p style="text-align:center;color:var(--text-primary);font-weight:600;margin-bottom:16px">
          ${t('txv.resolved_question', '이 단계에서 문제가 해결되었나요?')}
        </p>

        <div class="btn-group">
          <button class="btn btn-success" onclick="TXVWizard.resolved()">
            ${App.statusSvg('normal')} ${t('txv.resolved', '해결됨')}
          </button>
          <button class="btn btn-secondary" onclick="TXVWizard.nextStep()">
            ${t('txv.not_resolved', '아니오')} →
          </button>
        </div>
      </div>`;
  }

  function nextStep() {
    const steps = currentMode === 'starving' ? STARVING_STEPS : FLOODING_STEPS;
    if (currentStepIndex < steps.length - 1) {
      currentStepIndex++;
      renderStep();
    } else {
      renderComplete(false);
    }
  }

  function goBack() {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      renderStep();
    } else {
      renderInitialScreen();
    }
  }

  function resolved() {
    renderComplete(true);
  }

  function renderComplete(wasResolved) {
    const container = document.getElementById('txv-content');
    if (!container) return;

    const steps = currentMode === 'starving' ? STARVING_STEPS : FLOODING_STEPS;
    const stepTitle = steps[currentStepIndex]?.title || '';

    if (wasResolved) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center">
          <div style="font-size:3rem;margin-bottom:16px">🎉</div>
          <h2 style="margin-bottom:12px;color:var(--accent-green)">${t('txv.problem_solved', '문제 해결!')}</h2>
          <p style="color:var(--text-secondary);margin-bottom:8px">
            <strong>${stepTitle}</strong> ${t('txv.solved_at_step', '단계에서 해결되었습니다.')}
          </p>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:24px">
            ${t('txv.recheck_hint', '시스템 안정화를 위해 15~30분 후 과열도/과냉도를 재확인하세요.')}
          </p>
          <button class="btn btn-primary" onclick="TXVWizard.initUI()">
            ${t('txv.go_start', '처음으로')}
          </button>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center">
          <div style="font-size:3rem;margin-bottom:16px">🔧</div>
          <h2 style="margin-bottom:12px;color:var(--accent-orange)">${t('txv.all_steps_done', '모든 단계 완료')}</h2>
          <p style="color:var(--text-secondary);font-size:var(--text-base);margin-bottom:16px">
            ${currentMode === 'starving' ? '7' : '5'} ${t('txv.checkpoints_checked', '체크포인트를 모두 확인했지만 문제가 해결되지 않았습니다.')}
          </p>
          <div class="alert-box alert-warning" style="text-align:left">
            ${App.statusSvg('warning')}
            <div>
              <strong>${t('txv.additional_action', '추가 조치 권장')}:</strong>
              <ul style="margin:8px 0 0 16px;line-height:1.8">
                <li>${t('txv.action_replace', 'TXV 자체 불량 가능성 — 교체 고려')}</li>
                <li>${t('txv.action_design', '시스템 설계 문제 검토 (용량 매칭)')}</li>
                <li>${t('txv.action_support', '제조사 기술지원 연락')}</li>
                ${currentMode === 'starving' ? `<li>${t('txv.try_flooding', '플러딩 경로도 확인해 보세요 (간헐적 증상)')}</li>` : `<li>${t('txv.try_starving', '스타빙 경로도 확인해 보세요 (간헐적 증상)')}</li>`}
              </ul>
            </div>
          </div>
          <div style="margin-top:24px;display:grid;gap:12px">
            <button class="btn btn-primary" onclick="TXVWizard.initUI()">
              ${t('txv.go_start', '처음으로')}
            </button>
            <button class="btn btn-outline" onclick="TXVWizard.startMode('${currentMode === 'starving' ? 'flooding' : 'starving'}')">
              ${currentMode === 'starving' ? t('txv.check_flooding', '플러딩 경로 확인') : t('txv.check_starving', '스타빙 경로 확인')}
            </button>
          </div>
        </div>`;
    }
  }

  return { initUI, startMode, nextStep, goBack, resolved };
})();
