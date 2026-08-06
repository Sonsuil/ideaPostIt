"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const boards = [
    { id: 'erp', name: 'ERP', desc: 'ERP 시스템 기능 개선', color: '#3b82f6' },
    { id: 'crm', name: 'CRM', desc: '고객 관계 관리 시스템 개선', color: '#10b981' },
    { id: 'accounting', name: '회계', desc: '회계 및 재무 관리 개선', color: '#f59e0b' },
    { id: 'operation', name: '운영', desc: '사내 운영 및 지원 시스템 개선', color: '#8b5cf6' },
  ];

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-1px' }}>
          💡 IdeaGather
        </h1>
        <p style={{ fontSize: '20px', color: 'var(--text2)' }}>
          개선이 필요한 시스템을 선택하고 아이디어를 남겨주세요.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', maxWidth: '800px', width: '100%', padding: '0 24px' }}>
        {boards.map(board => (
          <div
            key={board.id}
            onClick={() => router.push(`/${board.id}`)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '32px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = board.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', background: `${board.color}20`, color: board.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', marginBottom: '16px'
            }}>
              {board.name.charAt(0)}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>{board.name}</h2>
            <p style={{ color: 'var(--text2)', textAlign: 'center' }}>{board.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
