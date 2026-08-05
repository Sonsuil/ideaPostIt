"use client";

import { useEffect, useState, useRef } from "react";
import { Rnd } from "react-rnd";

type Postit = {
  id: number;
  content: string;
  color: string;
  folder_id: number | null;
  pos_x: number;
  pos_y: number;
};

type Folder = {
  id: number;
  name: string;
  pos_x: number;
  pos_y: number;
};

const COLORS = [
  { id: "var(--postit-yellow)", hex: "#FFF9B1" },
  { id: "var(--postit-pink)", hex: "#FFD4E5" },
  { id: "var(--postit-mint)", hex: "#C1F0D4" },
  { id: "var(--postit-sky)", hex: "#CDE6FA" },
  { id: "var(--postit-lilac)", hex: "#E2D4F0" },
  { id: "var(--postit-coral)", hex: "#FFD6C9" },
];

export default function Home() {
  const [postits, setPostits] = useState<Postit[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  const [openFolders, setOpenFolders] = useState<number[]>([]);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [focusedWindow, setFocusedWindow] = useState<number | 'desktop'>('desktop');
  
  const dialogRef = useRef<HTMLDialogElement>(null);
  const folderDialogRef = useRef<HTMLDialogElement>(null);
  const deleteFolderDialogRef = useRef<HTMLDialogElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0].id);
  const [newFolderName, setNewFolderName] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<number | null>(null);

  // References to track folder icon positions for collision detection
  const folderRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchFolders();
    fetchPostits();
  }, [activeColor]);

  const fetchFolders = async () => {
    const res = await fetch("/api/folders");
    if (res.ok) setFolders(await res.json());
  };

  const fetchPostits = async () => {
    let url = "/api/postits?";
    if (activeColor) url += `color=${encodeURIComponent(activeColor)}`;
    const res = await fetch(url);
    if (res.ok) setPostits(await res.json());
  };

  const handleAddPostit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    // Place new postit at center of screen approx
    const pos_x = Math.floor(Math.random() * 100) + 50;
    const pos_y = Math.floor(Math.random() * 100) + 50;

    const res = await fetch("/api/postits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, color: newColor, folder_id: targetFolderId, pos_x, pos_y }),
    });

    if (res.ok) {
      setNewContent("");
      dialogRef.current?.close();
      fetchPostits();
    }
  };

  const handleDeletePostit = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await fetch(`/api/postits/${id}`, { method: "DELETE" });
    fetchPostits();
  };
  
  const handleDeleteFolderPrompt = (id: number) => {
    setFolderToDelete(id);
    deleteFolderDialogRef.current?.showModal();
  };

  const executeDeleteFolder = async (deletePostits: boolean) => {
    if (folderToDelete === null) return;
    await fetch(`/api/folders/${folderToDelete}?deletePostits=${deletePostits}`, { method: "DELETE" });
    setOpenFolders(prev => prev.filter(f => f !== folderToDelete));
    deleteFolderDialogRef.current?.close();
    setFolderToDelete(null);
    fetchFolders();
    fetchPostits();
  };

  const handleMoveFolder = async (id: number, newFolderId: number | null) => {
    await fetch(`/api/postits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: newFolderId }),
    });
    fetchPostits();
  };

  const handleDragStopPostit = (id: number, e: any, d: any) => {
    const newX = d.x;
    const newY = d.y;
    
    // Check collision with folder icons
    let droppedInFolderId: number | null = null;
    const mouseX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const mouseY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    
    if (mouseX && mouseY && desktopRef.current) {
      for (const folder of folders) {
        const el = folderRefs.current[folder.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
            droppedInFolderId = folder.id;
            break;
          }
        }
      }
    }

    if (droppedInFolderId !== null) {
      // Move to folder
      handleMoveFolder(id, droppedInFolderId);
    } else {
      // Just update position
      setPostits(prev => prev.map(p => p.id === id ? { ...p, pos_x: newX, pos_y: newY } : p));
      fetch(`/api/postits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pos_x: newX, pos_y: newY }),
      });
    }
  };

  const handleDragStopFolder = (id: number, d: any) => {
    const newX = d.x;
    const newY = d.y;
    setFolders(prev => prev.map(f => f.id === id ? { ...f, pos_x: newX, pos_y: newY } : f));
    fetch(`/api/folders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pos_x: newX, pos_y: newY }),
    });
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    // Place at center
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName, pos_x: 100, pos_y: 100 }),
    });

    if (res.ok) {
      setNewFolderName("");
      folderDialogRef.current?.close();
      fetchFolders();
    }
  };

  const toggleFolderWindow = (id: number) => {
    if (openFolders.includes(id)) {
      setOpenFolders(prev => prev.filter(fid => fid !== id));
    } else {
      setOpenFolders(prev => [...prev, id]);
      setFocusedWindow(id);
    }
  };

  const openAddPostitDialog = (folderId: number | null) => {
    setTargetFolderId(folderId);
    dialogRef.current?.showModal();
  };

  const desktopPostits = postits.filter(p => p.folder_id === null);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Sidebar / Taskbar area */}
      <div className="filter-bar" style={{ padding: '16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 1000, position: 'relative' }}>
        <div className="row" style={{ marginRight: 'auto' }}>
          <button className="btn ghost sm" onClick={() => folderDialogRef.current?.showModal()}>
            + 새 폴더
          </button>
        </div>

        <div className="row">
          <span style={{ fontSize: '13px', color: 'var(--text2)', marginRight: '8px' }}>색상 필터:</span>
          {COLORS.map(c => (
            <div
              key={c.id}
              className={`color-circle ${activeColor === c.id ? 'active' : ''}`}
              style={{ background: c.id }}
              onClick={() => setActiveColor(c.id)}
            />
          ))}
          <div
             className={`color-circle ${activeColor === null ? 'active' : ''}`}
             style={{ background: activeColor === null ? 'var(--blue)' : 'var(--surface)', color: activeColor === null ? '#fff' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', marginLeft: '8px' }}
             onClick={() => setActiveColor(null)}
             title="전체 보기"
          >
            A
          </div>
          <button className="btn sm" style={{ marginLeft: '16px' }} onClick={() => openAddPostitDialog(null)}>+ 쪽지 추가</button>
        </div>
      </div>

      {/* Desktop Canvas */}
      <div 
        ref={desktopRef}
        className="grid-bg"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        onMouseDown={() => setFocusedWindow('desktop')}
      >
        {/* Render Folder Icons */}
        {folders.map(folder => {
          const count = postits.filter(p => p.folder_id === folder.id).length;
          return (
            <Rnd
              key={`folder-icon-${folder.id}`}
              default={{ x: folder.pos_x || 100, y: folder.pos_y || 100, width: 80, height: 80 }}
              position={{ x: folder.pos_x || 100, y: folder.pos_y || 100 }}
              onDragStop={(e, d) => handleDragStopFolder(folder.id, d)}
              enableResizing={false}
              bounds="parent"
              style={{ zIndex: 5 }}
            >
              <div 
                ref={el => { folderRefs.current[folder.id] = el; }}
                onDoubleClick={(e) => { e.stopPropagation(); toggleFolderWindow(folder.id); }}
                style={{
                  width: '100%', height: '100%', display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid var(--border)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)', userSelect: 'none'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>📁</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', wordBreak: 'break-all', padding: '0 4px' }}>
                  {folder.name} <span style={{color:'var(--blue)'}}>({count})</span>
                </div>
                <div style={{ position: 'absolute', top: '-6px', right: '-6px' }}>
                   <button onClick={(e) => { e.stopPropagation(); handleDeleteFolderPrompt(folder.id); }} style={{ background: '#b23c3c', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', fontSize: '10px' }}>X</button>
                </div>
              </div>
            </Rnd>
          );
        })}

        {/* Render Desktop Postits */}
        {desktopPostits.map(postit => (
          <Rnd
            key={postit.id}
            default={{ x: postit.pos_x, y: postit.pos_y, width: 220, height: 'auto' }}
            position={{ x: postit.pos_x, y: postit.pos_y }}
            onDragStop={(e, d) => handleDragStopPostit(postit.id, e, d)}
            enableResizing={false}
            bounds="parent"
            style={{ zIndex: 10 }}
          >
            <div className="postit-card" style={{ background: postit.color, width: '100%', height: '100%' }}>
              {postit.folder_id && (
                <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)', marginBottom: '4px', fontWeight: 'bold' }}>
                  📁 {folders.find(f => f.id === postit.folder_id)?.name}
                </div>
              )}
              <div className="postit-content">{postit.content}</div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: '10px' }}>
                <select 
                  className="sm"
                  style={{ width: 'auto', padding: '2px', fontSize: '11px', margin: 0 }}
                  value={postit.folder_id || ''}
                  onChange={(e) => handleMoveFolder(postit.id, e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">바탕화면</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePostit(postit.id); }}
                  className="btn danger sm"
                  style={{ padding: '2px 8px', fontSize: '11px', background: 'transparent', color: 'rgba(0,0,0,0.4)', border: 'none' }}
                >
                  삭제
                </button>
              </div>
            </div>
          </Rnd>
        ))}
      </div>

      {/* Folder Windows */}
      {openFolders.map(folderId => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return null;
        
        const folderPostits = postits.filter(p => p.folder_id === folderId);
        const isFocused = focusedWindow === folderId;

        return (
          <Rnd
            key={`window-${folderId}`}
            default={{ x: 100 + folderId * 20, y: 100 + folderId * 20, width: 600, height: 400 }}
            bounds="parent"
            dragHandleClassName="window-header"
            minWidth={300}
            minHeight={200}
            style={{ 
              zIndex: isFocused ? 100 : 50,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: isFocused ? '0 8px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onMouseDown={() => setFocusedWindow(folderId)}
          >
            {/* Window Header */}
            <div className="window-header" style={{ 
              padding: '10px 16px', 
              background: 'var(--navy)', 
              color: '#fff', 
              cursor: 'move', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopLeftRadius: '7px',
              borderTopRightRadius: '7px'
            }}>
              <div style={{ fontWeight: 'bold' }}>📁 {folder.name} ({folderPostits.length})</div>
              <div className="row">
                <button className="btn sm ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', padding: '2px 8px' }} onClick={(e) => { e.stopPropagation(); openAddPostitDialog(folderId); }}>
                  + 추가
                </button>
                <button className="btn sm danger" style={{ padding: '2px 8px', marginLeft: '8px' }} onClick={(e) => { e.stopPropagation(); toggleFolderWindow(folderId); }}>
                  X
                </button>
              </div>
            </div>
            
            {/* Window Content (Canvas) */}
            <div className="grid-bg" style={{ flex: 1, position: 'relative', overflow: 'auto', backgroundColor: 'var(--bg)' }}>
              <div style={{ width: '2000px', height: '2000px', position: 'relative' }}>
                {folderPostits.map(postit => (
                  <Rnd
                    key={postit.id}
                    default={{ x: postit.pos_x, y: postit.pos_y, width: 220, height: 'auto' }}
                    position={{ x: postit.pos_x, y: postit.pos_y }}
                    onDragStop={(e, d) => handleDragStopPostit(postit.id, e, d)}
                    enableResizing={false}
                    bounds="parent"
                    style={{ zIndex: 10 }}
                  >
                    <div className="postit-card" style={{ background: postit.color, width: '100%', height: '100%' }}>
                      <div className="postit-content">{postit.content}</div>
                      <div className="row" style={{ justifyContent: 'space-between', marginTop: '10px' }}>
                        <select 
                          className="sm"
                          style={{ width: 'auto', padding: '2px', fontSize: '11px', margin: 0 }}
                          value={postit.folder_id || ''}
                          onChange={(e) => handleMoveFolder(postit.id, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">바탕화면</option>
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePostit(postit.id); }}
                          className="btn danger sm"
                          style={{ padding: '2px 8px', fontSize: '11px', background: 'transparent', color: 'rgba(0,0,0,0.4)', border: 'none' }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </Rnd>
                ))}
              </div>
            </div>
          </Rnd>
        );
      })}

      {/* Postit Dialog */}
      <dialog ref={dialogRef}>
        <h2 style={{ marginTop: 0 }}>새 포스트잇 작성 {targetFolderId ? `(📁 ${folders.find(f => f.id === targetFolderId)?.name})` : '(바탕화면)'}</h2>
        <form onSubmit={handleAddPostit}>
          <textarea
            placeholder="여기에 아이디어를 적어보세요..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={4}
            required
          />
          <div style={{ margin: '12px 0' }}>
            <label>포스트잇 색상</label>
            <div className="row" style={{ marginTop: '8px' }}>
              {COLORS.map(c => (
                <div
                  key={c.id}
                  className={`color-circle ${newColor === c.id ? 'active' : ''}`}
                  style={{ background: c.id, width: '30px', height: '30px' }}
                  onClick={() => setNewColor(c.id)}
                />
              ))}
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn ghost" onClick={() => dialogRef.current?.close()}>취소</button>
            <button type="submit" className="btn">등록</button>
          </div>
        </form>
      </dialog>

      {/* Folder Dialog */}
      <dialog ref={folderDialogRef}>
        <h2 style={{ marginTop: 0 }}>새 폴더 추가</h2>
        <form onSubmit={handleAddFolder}>
          <input
            type="text"
            placeholder="폴더 이름"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            required
            autoFocus
          />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn ghost" onClick={() => folderDialogRef.current?.close()}>취소</button>
            <button type="submit" className="btn">추가</button>
          </div>
        </form>
      </dialog>

      {/* Delete Folder Dialog */}
      <dialog ref={deleteFolderDialogRef}>
        <h2 style={{ marginTop: 0 }}>폴더 삭제</h2>
        <p style={{ marginBottom: '24px' }}>폴더 안에 있는 쪽지들은 어떻게 할까요?</p>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn ghost" onClick={() => deleteFolderDialogRef.current?.close()}>취소</button>
          <div className="row">
            <button type="button" className="btn" onClick={() => executeDeleteFolder(false)}>바탕화면으로 이동</button>
            <button type="button" className="btn danger" style={{ background: '#b23c3c' }} onClick={() => executeDeleteFolder(true)}>모두 삭제</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
