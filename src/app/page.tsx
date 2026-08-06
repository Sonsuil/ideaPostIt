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
  is_locked?: number;
};

type Folder = {
  id: number;
  name: string;
  pos_x: number;
  pos_y: number;
  is_locked?: number;
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
  
  const [fullScreenFolderId, setFullScreenFolderId] = useState<number | null>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'canvas' | 'board'>('canvas');
  
  const dialogRef = useRef<HTMLDialogElement>(null);
  const folderDialogRef = useRef<HTMLDialogElement>(null);
  const deleteFolderDialogRef = useRef<HTMLDialogElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0].id);
  const [newFolderName, setNewFolderName] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);
  const [editPostitId, setEditPostitId] = useState<number | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<number | null>(null);
  const [activePostitId, setActivePostitId] = useState<number | null>(null);

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

  const handleSavePostit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    if (editPostitId !== null) {
      const res = await fetch(`/api/postits/${editPostitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, color: newColor }),
      });
      if (res.ok) {
        setEditPostitId(null);
        setNewContent("");
        dialogRef.current?.close();
        fetchPostits();
      }
    } else {
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
    if (fullScreenFolderId === folderToDelete) setFullScreenFolderId(null);
    deleteFolderDialogRef.current?.close();
    setFolderToDelete(null);
    fetchFolders();
    fetchPostits();
  };

  const toggleLockFolder = async (folder: Folder) => {
    const newStatus = folder.is_locked ? 0 : 1;
    await fetch(`/api/folders/${folder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_locked: newStatus }),
    });
    fetchFolders();
  };

  const toggleLockPostit = async (postit: Postit) => {
    const newStatus = postit.is_locked ? 0 : 1;
    await fetch(`/api/postits/${postit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_locked: newStatus }),
    });
    fetchPostits();
  };

  const handleSortItems = async (type: 'grid' | 'cascade', contextFolderId: number | null) => {
    const GRID_W = 240;
    const GRID_H = 160;
    const START_X = 20;
    const START_Y = 20;

    const occupied = new Set<string>();
    
    // 1. Record locked items
    const contextFolders = contextFolderId === null ? folders : [];
    const contextPostits = postits.filter(p => p.folder_id === contextFolderId);

    contextFolders.forEach(f => {
      if (f.is_locked === 1) {
        const gx = Math.max(0, Math.round((f.pos_x - START_X) / GRID_W));
        const gy = Math.max(0, Math.round((f.pos_y - START_Y) / GRID_H));
        occupied.add(`${gx},${gy}`);
      }
    });

    contextPostits.forEach(p => {
      if (p.is_locked === 1) {
        const gx = Math.max(0, Math.round((p.pos_x - START_X) / GRID_W));
        const gy = Math.max(0, Math.round((p.pos_y - START_Y) / GRID_H));
        occupied.add(`${gx},${gy}`);
      }
    });

    let currentGy = 0;
    let currentGx = 0;
    const maxColsDynamic = typeof window !== 'undefined' ? Math.max(5, Math.floor((window.innerWidth - 60) / GRID_W)) : 5;

    const getNextFreeGrid = (startX = 0, startY = 0, maxCols = maxColsDynamic) => {
      let gy = startY;
      let gx = startX;
      while (true) {
        if (!occupied.has(`${gx},${gy}`)) {
          occupied.add(`${gx},${gy}`);
          return { gx, gy, x: gx * GRID_W + START_X, y: gy * GRID_H + START_Y };
        }
        gx++;
        if (gx >= maxCols) {
          gx = 0;
          gy++;
        }
      }
    };

    const updates: Promise<any>[] = [];
    const colorOrder = COLORS.map(c => c.id);

    // 2. Sort folders (always Grid)
    const unlockedFolders = contextFolders.filter(f => f.is_locked !== 1).sort((a, b) => a.name.localeCompare(b.name));
    unlockedFolders.forEach(f => {
      const free = getNextFreeGrid(currentGx, currentGy);
      currentGx = free.gx;
      currentGy = free.gy;
      
      setFolders(prev => prev.map(folder => folder.id === f.id ? { ...folder, pos_x: free.x, pos_y: free.y } : folder));
      updates.push(
        fetch(`/api/folders/${f.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pos_x: free.x, pos_y: free.y }),
        })
      );
    });

    // 3. Sort postits
    const unlockedPostits = contextPostits.filter(p => p.is_locked !== 1).sort((a, b) => {
      const indexA = colorOrder.indexOf(a.color);
      const indexB = colorOrder.indexOf(b.color);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    if (type === 'grid') {
      unlockedPostits.forEach(p => {
        const free = getNextFreeGrid(currentGx, currentGy);
        currentGx = free.gx;
        currentGy = free.gy;

        setPostits(prev => prev.map(postit => postit.id === p.id ? { ...postit, pos_x: free.x, pos_y: free.y } : postit));
        updates.push(
          fetch(`/api/postits/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pos_x: free.x, pos_y: free.y }),
          })
        );
      });
    } else if (type === 'cascade') {
      let currentColor = '';
      let cascadeX = 0;
      let cascadeY = 0;
      let cascadeIndex = 0;

      unlockedPostits.forEach(p => {
        if (currentColor !== p.color) {
          currentColor = p.color;
          const free = getNextFreeGrid(currentGx, currentGy);
          currentGx = free.gx;
          currentGy = free.gy;
          cascadeX = free.x;
          cascadeY = free.y;
          cascadeIndex = 0;
        } else {
          cascadeIndex++;
        }

        const finalX = cascadeX + (cascadeIndex * 30);
        const finalY = cascadeY + (cascadeIndex * 30);

        setPostits(prev => prev.map(postit => postit.id === p.id ? { ...postit, pos_x: finalX, pos_y: finalY } : postit));
        updates.push(
          fetch(`/api/postits/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pos_x: finalX, pos_y: finalY }),
          })
        );
      });
    }

    await Promise.all(updates);
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

  const handleContentChange = (id: number, newContent: string) => {
    setPostits(prev => prev.map(p => p.id === id ? { ...p, content: newContent } : p));
  };

  const handleContentBlur = async (id: number, newContent: string) => {
    if (!newContent.trim()) return;
    await fetch(`/api/postits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
  };

  const handleRenameFolder = async (id: number, currentName: string) => {
    const newName = prompt("새 폴더 이름을 입력하세요:", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;
    
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    await fetch(`/api/folders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    fetchFolders();
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
    setFullScreenFolderId(id);
  };

  const openAddPostitDialog = (folderId: number | null) => {
    setEditPostitId(null);
    setNewContent("");
    setTargetFolderId(folderId);
    dialogRef.current?.showModal();
  };

  const openEditPostitDialog = (postit: Postit) => {
    setEditPostitId(postit.id);
    setNewContent(postit.content);
    setNewColor(postit.color);
    setTargetFolderId(postit.folder_id);
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
          <div style={{ marginLeft: '16px', display: 'flex', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
            <button 
              className={`btn sm ${viewMode === 'canvas' ? '' : 'ghost'}`} 
              style={{ borderRadius: 0, border: 'none', borderRight: '1px solid var(--border)' }}
              onClick={() => setViewMode('canvas')}
            >
              바탕화면 뷰
            </button>
            <button 
              className={`btn sm ${viewMode === 'board' ? '' : 'ghost'}`} 
              style={{ borderRadius: 0, border: 'none' }}
              onClick={() => setViewMode('board')}
            >
              게시판 뷰
            </button>
          </div>
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
          <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 8px' }} />
          <div
            className="color-circle"
            style={{ background: 'var(--surface)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', border: '1px solid var(--border)' }}
            title="바둑판 정렬"
            onClick={() => handleSortItems('grid', null)}
          >
            ▦
          </div>
          <div
            className="color-circle"
            style={{ background: 'var(--surface)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', border: '1px solid var(--border)', marginRight: '16px' }}
            title="계단식 정렬"
            onClick={() => handleSortItems('cascade', null)}
          >
            ▤
          </div>
          <button className="btn sm" onClick={() => openAddPostitDialog(null)}>+ 쪽지 추가</button>
        </div>
      </div>

      {viewMode === 'canvas' ? (
        <>
          {/* Desktop Canvas */}
          <div 
            ref={desktopRef}
            className="grid-bg"
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
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
              disableDragging={folder.is_locked === 1}
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
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)', userSelect: 'none',
                  opacity: folder.is_locked ? 0.8 : 1
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>📁</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center', wordBreak: 'break-all', padding: '0 4px' }}>
                  {folder.name} <span style={{color:'var(--blue)'}}>({count})</span>
                </div>
                <div style={{ position: 'absolute', top: '-6px', right: '-6px', display: 'flex', gap: '4px' }}>
                   <button onClick={(e) => { e.stopPropagation(); toggleLockFolder(folder); }} style={{ background: folder.is_locked ? '#666' : '#999', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', fontSize: '10px' }} title={folder.is_locked ? '잠금 해제' : '잠금'}>{folder.is_locked ? '🔒' : '🔓'}</button>
                   {folder.is_locked !== 1 && (
                     <>
                       <button onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder.id, folder.name); }} style={{ background: 'var(--blue)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', fontSize: '10px' }} title="이름 변경">✎</button>
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteFolderPrompt(folder.id); }} style={{ background: '#b23c3c', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', fontSize: '10px' }} title="폴더 삭제">X</button>
                     </>
                   )}
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
            onDragStart={() => setActivePostitId(postit.id)}
            onDragStop={(e, d) => handleDragStopPostit(postit.id, e, d)}
            enableResizing={false}
            disableDragging={postit.is_locked === 1}
            bounds="parent"
            style={{ zIndex: activePostitId === postit.id ? 20 : 10 }}
            onMouseDown={() => setActivePostitId(postit.id)}
          >
            <div className="postit-card" style={{ background: postit.color, width: '100%', height: '100%' }}>
              {postit.folder_id && (
                <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.5)', marginBottom: '4px', fontWeight: 'bold' }}>
                  📁 {folders.find(f => f.id === postit.folder_id)?.name}
                </div>
              )}
              <textarea 
                className="postit-content" 
                value={postit.content}
                onChange={(e) => handleContentChange(postit.id, e.target.value)}
                onBlur={(e) => handleContentBlur(postit.id, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                readOnly={postit.is_locked === 1}
                style={{
                  background: 'transparent',
                  border: 'none',
                  resize: 'none',
                  flex: 1,
                  outline: 'none',
                  fontFamily: 'inherit',
                  padding: 0,
                  margin: 0,
                  boxShadow: 'none'
                }}
              />
              <div className="row" style={{ justifyContent: 'space-between', marginTop: '10px' }}>
                {postit.is_locked !== 1 ? (
                  <select 
                    className="sm"
                    style={{ width: 'auto', padding: '2px', fontSize: '11px', margin: 0 }}
                    value={postit.folder_id || ''}
                    onChange={(e) => handleMoveFolder(postit.id, e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">바탕화면</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                ) : <div />}
                <div className="row">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLockPostit(postit); }}
                    className="btn ghost sm"
                    style={{ padding: '2px 8px', fontSize: '11px', background: postit.is_locked ? '#666' : 'transparent', color: postit.is_locked ? '#fff' : 'rgba(0,0,0,0.6)', border: 'none', marginRight: '4px', borderRadius: '4px' }}
                    title={postit.is_locked ? '잠금 해제' : '잠금'}
                  >
                    {postit.is_locked ? '🔒' : '🔓'}
                  </button>
                  {postit.is_locked !== 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditPostitDialog(postit); }}
                        className="btn ghost sm"
                        style={{ padding: '2px 8px', fontSize: '11px', background: 'transparent', color: 'rgba(0,0,0,0.6)', border: 'none', marginRight: '4px' }}
                      >
                        색상
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePostit(postit.id); }}
                        className="btn danger sm"
                        style={{ padding: '2px 8px', fontSize: '11px', background: 'transparent', color: 'rgba(0,0,0,0.4)', border: 'none' }}
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Rnd>
        ))}
      </div>

          {/* Full Screen Folder View */}
      {fullScreenFolderId !== null && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--bg)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
          <div className="topbar" style={{ background: 'var(--navy)', color: '#fff' }}>
            <div className="row">
              <button className="btn ghost sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', marginRight: '16px' }} onClick={() => setFullScreenFolderId(null)}>
                ← 바탕화면으로 돌아가기
              </button>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                📁 {folders.find(f => f.id === fullScreenFolderId)?.name} ({postits.filter(p => p.folder_id === fullScreenFolderId).length})
              </span>
            </div>
            <div className="row">
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginRight: '8px' }}>색상 필터:</span>
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
                 style={{ background: activeColor === null ? 'var(--blue)' : 'var(--surface)', color: activeColor === null ? '#fff' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', marginLeft: '8px', marginRight: '16px' }}
                 onClick={() => setActiveColor(null)}
                 title="전체 보기"
              >
                A
              </div>
              <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.3)', margin: '0 8px' }} />
              <div
                className="color-circle"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', border: '1px solid rgba(255,255,255,0.3)' }}
                title="바둑판 정렬"
                onClick={() => handleSortItems('grid', fullScreenFolderId)}
              >
                ▦
              </div>
              <div
                className="color-circle"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', border: '1px solid rgba(255,255,255,0.3)', marginRight: '16px' }}
                title="계단식 정렬"
                onClick={() => handleSortItems('cascade', fullScreenFolderId)}
              >
                ▤
              </div>
              <button className="btn sm ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', marginRight: '8px' }} onClick={() => handleRenameFolder(fullScreenFolderId, folders.find(f => f.id === fullScreenFolderId)?.name || '')}>
                ✎ 이름 변경
              </button>
              <button className="btn sm ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => openAddPostitDialog(fullScreenFolderId)}>
                + 쪽지 추가
              </button>
            </div>
          </div>
          <div className="grid-bg" style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative' }}>
            <div style={{ position: 'relative', width: '100%', minHeight: '100%' }}>
              {postits.filter(p => p.folder_id === fullScreenFolderId).map(postit => (
                <Rnd
                  key={postit.id}
                  default={{ x: postit.pos_x, y: postit.pos_y, width: 220, height: 'auto' }}
                  position={{ x: postit.pos_x, y: postit.pos_y }}
                  grid={[240, 160]}
                  onDragStart={() => setActivePostitId(postit.id)}
                  onDragStop={(e, d) => handleDragStopPostit(postit.id, e, d)}
                  enableResizing={false}
                  disableDragging={postit.is_locked === 1}
                  bounds="parent"
                  style={{ zIndex: activePostitId === postit.id ? 20 : 10 }}
                  onMouseDown={() => setActivePostitId(postit.id)}
                >
                  <div className="postit-card" style={{ background: postit.color, width: '100%', height: '100%' }}>
                    <textarea 
                      className="postit-content" 
                      value={postit.content}
                      onChange={(e) => handleContentChange(postit.id, e.target.value)}
                      onBlur={(e) => handleContentBlur(postit.id, e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      readOnly={postit.is_locked === 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        resize: 'none',
                        flex: 1,
                        outline: 'none',
                        fontFamily: 'inherit',
                        padding: 0,
                        margin: 0,
                        boxShadow: 'none',
                        minHeight: '80px'
                      }}
                    />
                    <div className="row" style={{ justifyContent: 'space-between', marginTop: '10px' }}>
                      {postit.is_locked !== 1 ? (
                        <select 
                          className="sm"
                          style={{ width: 'auto', padding: '2px', fontSize: '11px', margin: 0 }}
                          value={postit.folder_id || ''}
                          onChange={(e) => handleMoveFolder(postit.id, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">바탕화면</option>
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      ) : <div />}
                      <div className="row">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleLockPostit(postit); }}
                          className="btn ghost sm"
                          style={{ padding: '2px 8px', fontSize: '11px', background: postit.is_locked ? '#666' : 'transparent', color: postit.is_locked ? '#fff' : 'rgba(0,0,0,0.6)', border: 'none', marginRight: '4px', borderRadius: '4px' }}
                          title={postit.is_locked ? '잠금 해제' : '잠금'}
                        >
                          {postit.is_locked ? '🔒' : '🔓'}
                        </button>
                        {postit.is_locked !== 1 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditPostitDialog(postit); }}
                              className="btn ghost sm"
                              style={{ padding: '2px 8px', fontSize: '11px', background: 'transparent', color: 'rgba(0,0,0,0.6)', border: 'none', marginRight: '4px' }}
                            >
                              색상
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePostit(postit.id); }}
                              className="btn danger sm"
                              style={{ padding: '2px 8px', fontSize: '11px', background: 'transparent', color: 'rgba(0,0,0,0.4)', border: 'none' }}
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Rnd>
              ))}
              {postits.filter(p => p.folder_id === fullScreenFolderId).length === 0 && (
                <div style={{ padding: '40px', color: 'var(--text2)', textAlign: 'center', width: '100%' }}>
                  이 폴더에는 아직 쪽지가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      ) : (
        <div style={{ padding: '24px', height: '100%', overflow: 'auto', backgroundColor: 'var(--bg)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'var(--surface)', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>전체 쪽지 게시판</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '12px 8px', width: '60%' }}>내용</th>
                  <th style={{ padding: '12px 8px', width: '15%' }}>위치 (폴더)</th>
                  <th style={{ padding: '12px 8px', width: '10%' }}>색상</th>
                  <th style={{ padding: '12px 8px', width: '15%' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {postits.map(postit => (
                  <tr key={postit.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' }}>
                      <textarea
                        value={postit.content}
                        onChange={(e) => handleContentChange(postit.id, e.target.value)}
                        onBlur={(e) => handleContentBlur(postit.id, e.target.value)}
                        readOnly={postit.is_locked === 1}
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          background: 'transparent',
                          border: '1px solid transparent',
                          resize: 'vertical',
                          outline: 'none',
                          fontFamily: 'inherit',
                          padding: '4px',
                        }}
                        onFocus={(e) => { e.target.style.border = '1px solid var(--border)'; e.target.style.background = 'var(--surface)'; }}
                        onBlurCapture={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {postit.is_locked !== 1 ? (
                        <select 
                          className="sm"
                          style={{ width: '100%', padding: '6px', fontSize: '13px' }}
                          value={postit.folder_id || ''}
                          onChange={(e) => handleMoveFolder(postit.id, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">바탕화면</option>
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                          {postit.folder_id ? folders.find(f => f.id === postit.folder_id)?.name : '바탕화면'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: postit.color, border: '1px solid rgba(0,0,0,0.1)' }} title={postit.color} />
                    </td>
                    <td style={{ padding: '12px 8px', display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => toggleLockPostit(postit)}
                        className="btn ghost sm"
                        style={{ padding: '4px 12px', background: postit.is_locked ? '#666' : 'transparent', color: postit.is_locked ? '#fff' : 'rgba(0,0,0,0.6)' }}
                        title={postit.is_locked ? '잠금 해제' : '잠금'}
                      >
                        {postit.is_locked ? '🔒' : '🔓'}
                      </button>
                      {postit.is_locked !== 1 && (
                        <>
                          <button
                            onClick={() => openEditPostitDialog(postit)}
                            className="btn ghost sm"
                            style={{ padding: '4px 12px' }}
                          >
                            색상
                          </button>
                          <button
                            onClick={() => handleDeletePostit(postit.id)}
                            className="btn danger sm"
                            style={{ padding: '4px 12px' }}
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {postits.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
                      등록된 쪽지가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Postit Dialog */}
      <dialog ref={dialogRef}>
        <h2 style={{ marginTop: 0 }}>{editPostitId ? '포스트잇 색상 변경' : `새 포스트잇 작성 ${targetFolderId ? `(📁 ${folders.find(f => f.id === targetFolderId)?.name})` : '(바탕화면)'}`}</h2>
        <form onSubmit={handleSavePostit}>
          {!editPostitId && (
            <textarea
              placeholder="여기에 아이디어를 적어보세요..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={4}
              required
            />
          )}
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
