import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { db, auth } from './firebase';
import './index.css';
import logoImg from './assets/logo.PNG';
import profileImg from './assets/profile.jpg';

// Initial Data
const initialProfile = {
  name: 'Camilla Pinto',
  role: 'UX Designer & Front-end Explorer',
  description: 'Transformando cafeína e ideias em interfaces fluidas, acessíveis e focadas nas pessoas. Apaixonada por entender o comportamento humano e construir pontes através da tecnologia.',
  email: 'camilla.pinto@email.com',
  linkedin: 'linkedin.com/in/camillapinto',
  location: 'São Paulo, SP'
};

const initialAbout = 'Sou estudante universitária cursando Design Digital, buscando constantemente aprender como tornar o complexo em algo simples e prazeroso.\n\nMinha abordagem une o design centrado no usuário (UX) e o desenvolvimento front-end moderno (React). Acredito firmemente que o design não é apenas sobre a estética, mas sobre como as pessoas interagem e se sentem. Meu objetivo profissional atual é criar experiências que resolvam problemas reais com beleza, empatia e alta eficiência.';

const initialHardSkills = ['Figma', 'UI Design', 'Wireframing', 'Prototipação', 'React.js', 'JavaScript (ES6+)', 'HTML & CSS'];
const initialSoftSkills = ['UX Research', 'Empatia', 'Comunicação', 'Resolução de Problemas', 'Trabalho em Equipe'];
const initialLanguages = [
  { id: 1, name: 'Inglês - Avançado', link: '' },
  { id: 2, name: 'Espanhol - Básico', link: '' }
];

const initialProjects = [
  { id: 1, title: 'Redesign App Financeiro', desc: 'Pesquisa com usuários, wireframes e protótipo de alta fidelidade para melhorar a conversão e usabilidade de um app de finanças.', tags: 'UX Research, Figma, UI Design', github: '' },
  { id: 2, title: 'Plataforma de E-learning', desc: 'Desenvolvimento do front-end em React focando em acessibilidade e performance para milhares de alunos simultâneos.', tags: 'React, CSS, Acessibilidade', github: '' },
  { id: 3, title: 'Design System "Aurora"', desc: 'Criação e documentação de um design system completo para uniformizar produtos de uma startup de saúde.', tags: 'Design System, Tokens, Components', github: '' }
];

const initialExperiences = [
  { id: 1, role: 'UX/UI Designer Júnior', company: 'Agência Criativa XYZ', date: 'Jan 2025 - Presente', desc: 'Desenvolvimento de wireframes, protótipos navegáveis e pesquisa com usuários para validar novas funcionalidades em ecossistemas web complexos.' },
  { id: 2, role: 'Estagiária Front-end', company: 'StartUp Inovadora', date: 'Fev 2024 - Dez 2024', desc: 'Implementação de interfaces interativas em React, focadas rigorosamente em usabilidade, design responsivo conectando a APIs.' }
];

const initialEducations = [
  { id: 1, degree: 'Graduação em Design Digital', school: 'Universidade Federal', desc: 'Foco de estudos intenso em Interação Humano-Computador, pesquisa acadêmica voltada à acessibilidade e arquitetura de informação.' }
];

const initialCertificates = [
  { id: 1, title: 'UX Design Fundamentals', issuer: 'Google', link: '#' },
  { id: 2, title: 'React.js & Front-end Completo', issuer: 'Rocketseat', link: '#' }
];

function Portfolio({ profile, about, hardSkills, softSkills, languages, projects, experiences, educations, certificates }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleGeneratePdf = async () => {
    if (isGeneratingPdf) {
      return;
    }

    const portfolioContent = document.querySelector('.portfolio-container');
    if (!portfolioContent) {
      alert('Nao foi possivel localizar o conteudo do portfolio para gerar o PDF.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const safeName = profile.name
        ? profile.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : 'camilla-pinto';

      const canvas = await html2canvas(portfolioContent, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        scrollX: 0,
        scrollY: -window.scrollY,
        onclone: (clonedDoc) => {
          const clonedWrapper = clonedDoc.querySelector('.portfolio-wrapper');
          if (clonedWrapper) clonedWrapper.classList.add('pdf-exporting');

          clonedDoc.querySelectorAll('.content-section').forEach((section) => {
            section.style.opacity = '1';
            section.style.animation = 'none';
          });
        }
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 8;
      const pageWidthMm = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeightMm = pdf.internal.pageSize.getHeight() - margin * 2;
      const pageHeightPx = Math.floor((pageHeightMm * canvas.width) / pageWidthMm);

      const sectionSelectors = ['.hero-section', '#about', '#projects', '#experience', '#certificates'];
      const sourceHeightPx = portfolioContent.scrollHeight || 1;
      const scaleY = canvas.height / sourceHeightPx;
      const breakpointsPx = sectionSelectors
        .map((selector) => portfolioContent.querySelector(selector))
        .filter(Boolean)
        .map((el) => Math.floor(el.offsetTop * scaleY))
        .filter((value) => value > 0)
        .sort((a, b) => a - b);

      let renderedHeightPx = 0;
      let pageIndex = 0;

      while (renderedHeightPx < canvas.height) {
        const idealEndPx = renderedHeightPx + pageHeightPx;
        let targetEndPx = Math.min(idealEndPx, canvas.height);

        if (idealEndPx < canvas.height) {
          const minCutPx = renderedHeightPx + Math.floor(pageHeightPx * 0.65);
          const maxCutPx = Math.min(canvas.height, renderedHeightPx + Math.floor(pageHeightPx * 1.08));
          const candidateCuts = breakpointsPx.filter((bp) => bp > minCutPx && bp < maxCutPx);
          if (candidateCuts.length > 0) {
            targetEndPx = candidateCuts.reduce((best, current) =>
              Math.abs(current - idealEndPx) < Math.abs(best - idealEndPx) ? current : best
            , candidateCuts[0]);
          }
        }

        const minTailPx = Math.floor(pageHeightPx * 0.2);
        if (canvas.height - targetEndPx < minTailPx) {
          targetEndPx = canvas.height;
        }

        const sliceHeightPx = Math.max(1, targetEndPx - renderedHeightPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;

        const pageContext = pageCanvas.getContext('2d');
        if (!pageContext) break;

        pageContext.drawImage(
          canvas,
          0,
          renderedHeightPx,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );

        const pageImageData = pageCanvas.toDataURL('image/jpeg', 0.98);
        const sliceHeightMm = (sliceHeightPx * pageWidthMm) / canvas.width;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(pageImageData, 'JPEG', margin, margin, pageWidthMm, sliceHeightMm, undefined, 'FAST');

        renderedHeightPx += sliceHeightPx;
        pageIndex += 1;
      }

      pdf.save(`${safeName}-curriculo.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Nao foi possivel gerar o PDF agora. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className={`portfolio-wrapper ${isGeneratingPdf ? 'pdf-exporting' : ''}`}>
      {/* NavBar */}
      <nav className="navbar no-print">
        <div className="nav-logo">
          <img src={logoImg} alt="Logo" className="nav-logo-img" />
        </div>
        <button
          type="button"
          className="nav-toggle"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
          aria-label="Abrir ou fechar menu de navegação"
        >
          <span>Menu</span>
          <span className={`nav-toggle-arrow ${isMobileMenuOpen ? 'open' : ''}`}>▾</span>
        </button>
        <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
          <a href="#about" onClick={() => setIsMobileMenuOpen(false)}>Sobre Mim</a>
          <a href="#projects" onClick={() => setIsMobileMenuOpen(false)}>Projetos</a>
          <a href="#experience" onClick={() => setIsMobileMenuOpen(false)}>Trajetória</a>
          <a href="#certificates" onClick={() => setIsMobileMenuOpen(false)}>Cursos e Títulos</a>
          <button
            type="button"
            className="nav-link-pdf-btn"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? 'Gerando PDF...' : '🖨️ Baixar PDF'}
          </button>
        </div>
        <div className={`nav-actions ${isMobileMenuOpen ? 'open' : ''}`}>
          <button className="btn" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? 'Gerando PDF...' : '🖨️ PDF'}
          </button>
        </div>
      </nav>

      <div className="portfolio-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Olá, eu sou a <br /><span className="highlight-text">{profile.name}</span>
            </h1>
            <h2 className="hero-subtitle">{profile.role}</h2>
            <p className="hero-description">{profile.description}</p>
            <div className="hero-contact">
              {isGeneratingPdf ? (
                <span className="contact-pill">📱 WhatsApp</span>
              ) : (
                <a href="https://wa.me/5521981235592" target="_blank" rel="noreferrer" className="contact-pill" style={{ textDecoration: 'none' }}>📱 WhatsApp</a>
              )}
              {isGeneratingPdf ? (
                <span className="contact-pill">📧 {profile.email}</span>
              ) : (
                <a href={`mailto:${profile.email}`} className="contact-pill" style={{ textDecoration: 'none' }}>📧 {profile.email}</a>
              )}
              {isGeneratingPdf ? (
                <span className="contact-pill">💼 LinkedIn</span>
              ) : (
                <a href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noreferrer" className="contact-pill" style={{ textDecoration: 'none' }}>💼 LinkedIn</a>
              )}
              <span className="contact-pill">📍 {profile.location}</span>
            </div>
          </div>
          <div className="hero-image-container">
            <img src={profileImg} alt="Profile" className="hero-image" />
          </div>
        </section>

        {/* Sobre Mim e Skills */}
        <section id="about" className="content-section split-section">
          <div className="about-block">
            <h3 className="section-title">Sobre Mim</h3>
            <p className="about-text" style={{ whiteSpace: 'pre-line', marginBottom: '40px' }}>{about}</p>

            <h3 className="section-title" style={{ fontSize: '2rem' }}>Idiomas</h3>
            <div className="skills-grid">
              {languages.map((lang, index) => {
                const langName = typeof lang === 'string' ? lang : lang.name;
                const langLink = typeof lang === 'string' ? '' : lang.link;
                if (!langName) return null;

                if (!isGeneratingPdf && langLink && langLink.trim() !== '' && langLink.trim() !== '#') {
                  return (
                    <a href={langLink} target="_blank" rel="noreferrer" key={lang.id || index} className="skill-pill" style={{ background: 'var(--color-primary)', color: 'white', borderColor: 'transparent', textDecoration: 'none', cursor: 'pointer', transition: 'transform 0.2s', display: 'inline-block' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                      {langName.trim()}
                    </a>
                  );
                }
                return (
                  <span key={lang.id || index} className="skill-pill" style={{ background: 'var(--color-primary)', color: 'white', borderColor: 'transparent' }}>
                    {langName.trim()}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="skills-block">
            <h3 className="section-title">Hard Skills</h3>
            <div className="skills-grid" style={{ marginBottom: '40px' }}>
              {hardSkills.map((skill, index) => (
                <span key={index} className="skill-pill">{skill.trim()}</span>
              ))}
            </div>

            <h3 className="section-title">Soft Skills</h3>
            <div className="skills-grid">
              {softSkills.map((skill, index) => (
                <span key={index} className="skill-pill" style={{ borderColor: 'var(--color-accent1)' }}>{skill.trim()}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Projetos */}
        <section id="projects" className="content-section">
          <h3 className="section-title center">Projetos em Destaque</h3>
          <div className="projects-grid">
            {projects.map((proj) => (
              <div key={proj.id} className="project-card">
                <div className="project-card-header">
                  <h4>{proj.title}</h4>
                </div>
                <div className="project-card-body">
                  <p>{proj.desc}</p>
                  <div className="project-tags" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {proj.tags.split(',').map((tag, index) =>
                        <span key={index} className="tag">{tag.trim()}</span>
                      )}
                    </div>
                    {proj.github && (
                      <a href={proj.github} target="_blank" rel="noreferrer" className="no-print" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', transition: 'transform 0.2s', padding: '5px' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} title="Ver repositório no Github">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.15-1.1-1.46-1.1-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 10 0 0 12 2Z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Experiência & Educação */}
        <section id="experience" className="content-section split-section">
          <div className="experience-block">
            <h3 className="section-title">Trajetória</h3>
            <div className="timeline">
              {experiences.map(exp => (
                <div key={exp.id} className="timeline-item">
                  <div className="tl-dot"></div>
                  <div className="tl-content">
                    <h4>{exp.role}</h4>
                    <h5>{exp.company} • {exp.date}</h5>
                    <p>{exp.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="education-block">
            <h3 className="section-title">Formação</h3>
            <div className="timeline">
              {educations.map(edu => (
                <div key={edu.id} className="timeline-item">
                  <div className="tl-dot highlight"></div>
                  <div className="tl-content">
                    <h4>{edu.degree}</h4>
                    <h5>{edu.school}</h5>
                    <p>{edu.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cursos e Títulos */}
        <section id="certificates" className="content-section">
          <h3 className="section-title">Cursos e Títulos</h3>
          <div className="certificates-grid">
            {certificates.map((cert) => (
              <div key={cert.id} className="certificate-card">
                <div className="cert-title">{cert.title}</div>
                <div className="cert-issuer">{cert.issuer}</div>
                {(cert.link && cert.link.trim() !== '' && cert.link.trim() !== '#') && (
                  !isGeneratingPdf && (
                    <a href={cert.link} target="_blank" rel="noreferrer" className="cert-link">Visualizar Certificado</a>
                  )
                )}
              </div>
            ))}
          </div>
        </section>

        <footer className="footer no-print">
          <p>Design & Código desenvolvidos por Camilla Pinto © {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
}

function AdminPanel({
  profile, setProfile,
  about, setAbout,
  hardSkills, setHardSkills,
  softSkills, setSoftSkills,
  languages, setLanguages,
  projects, setProjects,
  experiences, setExperiences,
  educations, setEducations,
  certificates, setCertificates
}) {
  const navigate = useNavigate();

  // Helper to update fields within arrays of objects
  const handleArrayChange = (setter, stateArray, id, field, value) => {
    setter(stateArray.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleHardSkillsChange = (e) => {
    setHardSkills(e.target.value.split(','));
  };

  const handleSoftSkillsChange = (e) => {
    setSoftSkills(e.target.value.split(','));
  };

  const addLanguage = () => {
    const newLang = { id: Date.now(), name: '', link: '' };
    setLanguages([...languages, newLang]);
  };

  const removeLanguage = (id) => {
    setLanguages(languages.filter(lang => lang.id !== id));
  };

  const addCertificate = () => {
    const newCert = { id: Date.now(), title: '', issuer: '', link: '' };
    setCertificates([...certificates, newCert]);
  };

  const removeCertificate = (id) => {
    setCertificates(certificates.filter(c => c.id !== id));
  };

  const addProject = () => {
    const newProj = { id: Date.now(), title: '', desc: '', tags: '', github: '' };
    setProjects([...projects, newProj]);
  };

  const removeProject = (id) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const addExperience = () => {
    const newExp = { id: Date.now(), role: '', company: '', date: '', desc: '' };
    setExperiences([...experiences, newExp]);
  };

  const removeExperience = (id) => {
    setExperiences(experiences.filter(e => e.id !== id));
  };

  const addEducation = () => {
    const newEdu = { id: Date.now(), degree: '', school: '', desc: '' };
    setEducations([...educations, newEdu]);
  };

  const removeEducation = (id) => {
    setEducations(educations.filter(e => e.id !== id));
  };

  const saveToFirebase = async () => {
    try {
      if (!db) {
        alert("O Firebase não foi configurado ou ainda está instalando.");
        return;
      }
      await setDoc(doc(db, "portfolio", "data"), {
        profile, about, hardSkills, softSkills, languages, projects, experiences, educations, certificates
      });
      alert('Tudo salvo na nuvem com sucesso! O portfólio já está atualizado no banco.');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar no banco. Você inseriu suas credenciais Firestore em src/firebase.js corretamente?');
    }
  };

  return (
    <div className="admin-wrapper" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-family)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>⚙️ Painel de Administração</h1>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="btn" onClick={saveToFirebase} style={{ background: 'linear-gradient(135deg, var(--color-accent1) 0%, #D88E99 100%)', boxShadow: '0 6px 15px rgba(183, 110, 121, 0.3)' }}>💾 Salvar Nuvem</button>
          <button className="btn btn-secondary" onClick={() => { signOut(auth); navigate('/'); }}>Sair</button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Voltar</button>
        </div>
      </div>

      <div className="admin-card">
        <h3>1. Cabeçalho (Hero)</h3>
        <div className="form-group">
          <label>Nome</label>
          <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Cargo / Título</label>
          <input type="text" value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Descrição em Destaque</label>
          <textarea style={textAreaStyle} value={profile.description} onChange={e => setProfile({ ...profile, description: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>E-mail</label>
            <input type="text" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>LinkedIn</label>
            <input type="text" value={profile.linkedin} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Localização</label>
            <input type="text" value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3>2. Sobre Mim</h3>
        <div className="form-group">
          <label>Texto descritivo</label>
          <textarea style={textAreaStyle} rows={6} value={about} onChange={e => setAbout(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Hard Skills (separadas por vírgula)</label>
          <input type="text" value={hardSkills.join(',')} onChange={handleHardSkillsChange} />
        </div>
        <div className="form-group">
          <label>Soft Skills (separadas por vírgula)</label>
          <input type="text" value={softSkills.join(',')} onChange={handleSoftSkillsChange} />
        </div>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>2.5 Idiomas e Certificados</h3>
          <button className="btn btn-secondary" onClick={addLanguage} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>+ Novo</button>
        </div>
        {languages.map((lang) => (
          <div key={lang.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <input type="text" placeholder="Idioma / Nível" style={{ flex: 1.5, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', fontSize: '1rem' }} value={lang.name} onChange={e => handleArrayChange(setLanguages, languages, lang.id, 'name', e.target.value)} />
            <input type="url" placeholder="Link do Certificado (Opcional)" style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', fontSize: '1rem' }} value={lang.link || ''} onChange={e => handleArrayChange(setLanguages, languages, lang.id, 'link', e.target.value)} />
            <button onClick={() => removeLanguage(lang.id)} className="btn" style={{ padding: '8px 15px', background: 'red', color: 'white', borderRadius: '8px', boxShadow: 'none' }}>X</button>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>3. Projetos em Destaque</h3>
          <button className="btn btn-secondary" onClick={addProject} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>+ Novo</button>
        </div>
        {projects.map(proj => (
          <div key={proj.id} style={{ borderBottom: '1px solid #ddd', paddingBottom: '15px', marginBottom: '15px', position: 'relative', paddingTop: '25px' }}>
            <button
              onClick={() => removeProject(proj.id)}
              style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', borderRadius: '5px', padding: '5px', zIndex: 10, cursor: 'pointer' }}>
              X Remover
            </button>
            <div className="form-group"><label>Título do Projeto</label><input type="text" value={proj.title} onChange={e => handleArrayChange(setProjects, projects, proj.id, 'title', e.target.value)} /></div>
            <div className="form-group"><label>Descrição</label><textarea style={textAreaStyle} value={proj.desc} onChange={e => handleArrayChange(setProjects, projects, proj.id, 'desc', e.target.value)} /></div>
            <div className="form-group"><label>Tags (separadas por vírgula)</label><input type="text" value={proj.tags} onChange={e => handleArrayChange(setProjects, projects, proj.id, 'tags', e.target.value)} /></div>
            <div className="form-group"><label>Link do Github (Opcional)</label><input type="url" value={proj.github || ''} onChange={e => handleArrayChange(setProjects, projects, proj.id, 'github', e.target.value)} placeholder="https://github.com/..." /></div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>4. Experiência</h3>
          <button className="btn btn-secondary" onClick={addExperience} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>+ Novo</button>
        </div>
        {experiences.map(exp => (
          <div key={exp.id} style={{ borderBottom: '1px solid #ddd', paddingBottom: '15px', marginBottom: '15px', position: 'relative', paddingTop: '25px' }}>
            <button
              onClick={() => removeExperience(exp.id)}
              style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', borderRadius: '5px', padding: '5px', zIndex: 10, cursor: 'pointer' }}>
              X Remover
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}><label>Cargo</label><input type="text" value={exp.role} onChange={e => handleArrayChange(setExperiences, experiences, exp.id, 'role', e.target.value)} /></div>
              <div className="form-group" style={{ flex: 1 }}><label>Empresa</label><input type="text" value={exp.company} onChange={e => handleArrayChange(setExperiences, experiences, exp.id, 'company', e.target.value)} /></div>
              <div className="form-group" style={{ flex: 1 }}><label>Data</label><input type="text" value={exp.date} onChange={e => handleArrayChange(setExperiences, experiences, exp.id, 'date', e.target.value)} /></div>
            </div>
            <div className="form-group">
              <label>Descrição das atividades</label>
              <textarea style={textAreaStyle} value={exp.desc} onChange={e => handleArrayChange(setExperiences, experiences, exp.id, 'desc', e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>5. Educação</h3>
          <button className="btn btn-secondary" onClick={addEducation} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>+ Novo</button>
        </div>
        {educations.map(edu => (
          <div key={edu.id} style={{ borderBottom: '1px solid #ddd', paddingBottom: '15px', marginBottom: '15px', position: 'relative', paddingTop: '25px' }}>
            <button
              onClick={() => removeEducation(edu.id)}
              style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', borderRadius: '5px', padding: '5px', zIndex: 10, cursor: 'pointer' }}>
              X Remover
            </button>
            <div className="form-group"><label>Curso / Graduação</label><input type="text" value={edu.degree} onChange={e => handleArrayChange(setEducations, educations, edu.id, 'degree', e.target.value)} /></div>
            <div className="form-group"><label>Instituição</label><input type="text" value={edu.school} onChange={e => handleArrayChange(setEducations, educations, edu.id, 'school', e.target.value)} /></div>
            <div className="form-group"><label>Descrição / Foco</label><textarea style={textAreaStyle} value={edu.desc} onChange={e => handleArrayChange(setEducations, educations, edu.id, 'desc', e.target.value)} /></div>
          </div>
        ))}
      </div>

      <div className="admin-card" style={{ marginBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>6. Cursos e Títulos</h3>
          <button className="btn btn-secondary" onClick={addCertificate} style={{ padding: '5px 10px', fontSize: '0.9rem' }}>+ Novo</button>
        </div>

        {certificates.map((cert, index) => (
          <div key={cert.id} style={{ border: '1px solid var(--color-accent2)', padding: '15px', borderRadius: '10px', marginBottom: '15px', position: 'relative' }}>
            <button
              onClick={() => removeCertificate(cert.id)}
              style={{ position: 'absolute', top: 10, right: 10, background: 'red', color: 'white', border: 'none', borderRadius: '5px', padding: '5px' }}>
              X Remover
            </button>
            <div className="form-group" style={{ width: '90%' }}><label>Título do Curso</label><input type="text" value={cert.title} onChange={e => handleArrayChange(setCertificates, certificates, cert.id, 'title', e.target.value)} /></div>
            <div className="form-group"><label>Instituição Emissora</label><input type="text" value={cert.issuer} onChange={e => handleArrayChange(setCertificates, certificates, cert.id, 'issuer', e.target.value)} /></div>
            <div className="form-group"><label>Link do Certificado (Opcional)</label><input type="url" value={cert.link || ''} onChange={e => handleArrayChange(setCertificates, certificates, cert.id, 'link', e.target.value)} placeholder="https://..." /></div>
          </div>
        ))}
      </div>

    </div>
  );
}

const textAreaStyle = {
  width: '100%',
  padding: '12px 15px',
  borderRadius: '12px',
  border: '1px solid #ccc',
  fontFamily: 'inherit',
  fontSize: '1rem',
  minHeight: '80px',
  resize: 'vertical'
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Credenciais incorretas.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--glass-bg)' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: '30px' }}>🔐 Área Restrita</h2>
        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--color-primary)', fontWeight: 'bold' }}>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }} required />
        </div>
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--color-primary)', fontWeight: 'bold' }}>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }} required />
        </div>
        <button type="submit" className="btn" style={{ width: '100%', marginBottom: '15px' }}>Entrar no Painel</button>
        <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--color-accent1)', cursor: 'pointer', textDecoration: 'underline' }}>Voltar ao Portfólio</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(initialProfile);
  const [about, setAbout] = useState(initialAbout);
  const [hardSkills, setHardSkills] = useState(initialHardSkills);
  const [softSkills, setSoftSkills] = useState(initialSoftSkills);
  const [languages, setLanguages] = useState(initialLanguages);
  const [projects, setProjects] = useState(initialProjects);
  const [experiences, setExperiences] = useState(initialExperiences);
  const [educations, setEducations] = useState(initialEducations);
  const [certificates, setCertificates] = useState(initialCertificates);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const fetchData = async () => {
      try {
        if (!db) {
          setLoading(false);
          return;
        }
        const docRef = doc(db, "portfolio", "data");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profile) setProfile(data.profile);
          if (data.about) setAbout(data.about);
          if (data.hardSkills) setHardSkills(data.hardSkills);
          if (data.softSkills) setSoftSkills(data.softSkills);
          if (data.languages) {
            const formattedLanguages = data.languages.map((l, i) => typeof l === 'string' ? { id: Date.now() + i, name: l, link: '' } : l);
            setLanguages(formattedLanguages);
          }
          if (data.skills && !data.hardSkills) setHardSkills(data.skills); // Fallback data
          if (data.projects) setProjects(data.projects);
          if (data.experiences) setExperiences(data.experiences);
          if (data.educations) setEducations(data.educations);
          if (data.certificates) setCertificates(data.certificates);
        }
      } catch (e) {
        console.error("Erro ao buscar dados reais do banco. Usando dados falsos provisórios...", e);
      }
      setLoading(false);
    };

    fetchData();

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family)', color: 'var(--color-primary)', fontSize: '1.5rem' }}>Carregando dados na Nuvem...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <Portfolio
            profile={profile} about={about} hardSkills={hardSkills} softSkills={softSkills} languages={languages}
            projects={projects} experiences={experiences}
            educations={educations} certificates={certificates}
          />
        } />
        <Route path="/admin" element={
          user ? (
            <AdminPanel
              profile={profile} setProfile={setProfile}
              about={about} setAbout={setAbout}
              hardSkills={hardSkills} setHardSkills={setHardSkills}
              softSkills={softSkills} setSoftSkills={setSoftSkills}
              languages={languages} setLanguages={setLanguages}
              projects={projects} setProjects={setProjects}
              experiences={experiences} setExperiences={setExperiences}
              educations={educations} setEducations={setEducations}
              certificates={certificates} setCertificates={setCertificates}
            />
          ) : <Login />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
