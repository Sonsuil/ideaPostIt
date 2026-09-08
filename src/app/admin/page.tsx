"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Comment = {
  id: number;
  postit_id: number;
  admin_id: string;
  content: string;
  created_at: string;
};

type Postit = {
  id: number;
  content: string;
  color: string;
  board_id: string;
  created_at: string;
  comments: Comment[];
};

export default function AdminPage() {
  const router = useRouter();

  const [adminId, setAdminId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [loginId, setLoginId] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  const [postits, setPostits] = useState<Postit[]>([]);
  const [filterBoard, setFilterBoard] = useState<string>("all");
  const [selectedPostit, setSelectedPostit] = useState<Postit | null>(null);

  const [newComment, setNewComment] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const savedAdminId = sessionStorage.getItem('admin_id');
    if (savedAdminId) {
      setAdminId(savedAdminId);
    }
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (adminId) {
      fetchPostits();
    }
  }, [adminId, filterBoard]);

  const fetchPostits = async () => {
    const res = await fetch(`/api/admin/postits?board_id=${encodeURIComponent(filterBoard)}`);
    if (res.ok) {
      setPostits(await res.json());
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: loginId, password: loginPassword }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('admin_id', loginId);
        setAdminId(loginId);
      } else {
        setAuthError(data.error || "로그인 실패");
      }
    } catch (err) {
      setAuthError("오류가 발생했습니다.");
    }
  };

  const openPostitDetails = (postit: Postit) => {
    setSelectedPostit(postit);
    setNewComment("");
    dialogRef.current?.showModal();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPostit || !adminId) return;

    const res = await fetch("/api/admin/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postit_id: selectedPostit.id, admin_id: adminId, content: newComment }),
    });

    if (res.ok) {
      setNewComment("");
      // Update local state to show new comment immediately
      const newC = { id: Date.now(), postit_id: selectedPostit.id, admin_id: adminId, content: newComment, created_at: new Date().toISOString() };
      setSelectedPostit({ ...selectedPostit, comments: [...selectedPostit.comments, newC] });
      fetchPostits(); // Refresh list to update comment count
    }
  };

  if (isCheckingAuth) return null;

  if (!adminId) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <form onSubmit={handleLogin} style={{ background: 'var(--surface)', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '320px' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>👑</div>
          <h2 style={{ marginBottom: '8px', fontSize: '20px', fontWeight: 'bold' }}>관리자 로그인</h2>
          <p style={{ color: 'var(--text2)', marginBottom: '24px', fontSize: '14px' }}>관리자 계정 정보를 입력하세요.</p>

          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', marginBottom: '12px' }}
            placeholder="Admin ID"
            autoFocus
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text)', marginBottom: '16px' }}
            placeholder="Password"
          />
          {authError && <div style={{ color: 'var(--postit-coral)', fontSize: '13px', marginBottom: '16px' }}>{authError}</div>}

          <button type="submit" className="btn" style={{ width: '100%', background: 'var(--blue)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}>
            로그인
          </button>
          <button type="button" onClick={() => router.push('/')} className="btn ghost sm" style={{ marginTop: '16px' }}>
            메인으로 돌아가기
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <header className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <div className="brand" style={{ fontSize: '20px', fontWeight: 'bold' }}>👑 관리자 대시보드</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text2)' }}>로그인됨: <strong>{adminId}</strong></span>
          <button className="btn sm ghost" onClick={() => { sessionStorage.removeItem('admin_id'); setAdminId(null); }}>로그아웃</button>
        </div>
      </header>

      <div style={{ padding: '24px', width: '95%', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 'max-content' }}>목록</h1>
          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', width: '160px' }}
          >
            <option value="all">모든 보드 보기</option>
            <option value="erp">ERP</option>
            <option value="crm">CRM</option>
            <option value="accounting">회계</option>
            <option value="operation">운영</option>
          </select>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                <th style={{ padding: '16px', fontWeight: 'bold', width: '15%' }}>보드</th>
                <th style={{ padding: '16px', fontWeight: 'bold', width: '50%' }}>내용</th>
                <th style={{ padding: '16px', fontWeight: 'bold', width: '15%' }}>작성일시</th>
                <th style={{ padding: '16px', fontWeight: 'bold', width: '10%' }}>댓글</th>
                <th style={{ padding: '16px', fontWeight: 'bold', width: '10%' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {postits.map(postit => (
                <tr key={postit.id} style={{ borderBottom: '1px solid var(--border)', background: postit.color, color: '#000' }}>
                  <td style={{ padding: '16px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {postit.board_id}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                      {postit.content}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'rgba(0,0,0,0.6)', fontSize: '13px' }}>
                    {new Date(postit.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {postit.comments && postit.comments.length > 0 ? (
                      <span style={{ color: '#0056b3', fontWeight: 'bold' }}>{postit.comments.length}개</span>
                    ) : (
                      <span style={{ color: 'rgba(0,0,0,0.5)' }}>없음</span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button className="btn sm" style={{ background: 'rgba(0,0,0,0.05)', color: '#000', border: '1px solid rgba(0,0,0,0.1)' }} onClick={() => openPostitDetails(postit)}>보기/댓글</button>
                  </td>
                </tr>
              ))}
              {postits.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text2)' }}>
                    등록된 요청사항이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <dialog ref={dialogRef} className="dialog" onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}>
        {selectedPostit && (
          <div className="dialog-content" style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '8px', textTransform: 'uppercase' }}>{selectedPostit.board_id} 보드의 요청사항</div>
              <div style={{ padding: '16px', background: selectedPostit.color, borderRadius: '8px', color: '#000', fontSize: '16px', whiteSpace: 'pre-wrap', minHeight: '100px' }}>
                {selectedPostit.content}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>관리자 댓글</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                {selectedPostit.comments && selectedPostit.comments.length > 0 ? (
                  selectedPostit.comments.map(c => (
                    <div key={c.id} style={{ background: 'var(--background)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                        <strong style={{ color: 'var(--blue)' }}>{c.admin_id}</strong>
                        <span style={{ color: 'var(--text2)' }}>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{c.content}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>작성된 댓글이 없습니다.</div>
                )}
              </div>

              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                />
                <button type="submit" className="btn" style={{ background: 'var(--blue)', color: '#fff', border: 'none' }}>
                  작성
                </button>
              </form>
            </div>

            <button className="btn ghost" onClick={() => dialogRef.current?.close()}>닫기</button>
          </div>
        )}
      </dialog>
    </>
  );
}
