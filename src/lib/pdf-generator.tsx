import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';

// CSS Específico para o PDF (Não usa Tailwind, usa primitivos do React-PDF)
const styles = StyleSheet.create({
  pageLandscape: { paddingVertical: 15, paddingHorizontal: 15, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#ffffff' },
  pagePortrait: { paddingVertical: 15, paddingHorizontal: 15, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#ffffff' },
  
  // Crachá: 100 x 140 mm
  badgeCard: { width: '283pt', height: '396pt', backgroundColor: '#ffffff', borderRadius: 8, border: '1pt dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10, marginRight: 10 },
  // Santinho: 70 x 100 mm
  santinhoCard: { width: '198pt', height: '283pt', backgroundColor: '#0f172a', borderRadius: 8, border: '1pt dashed #475569', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 5, marginRight: 5 },

  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#fbbf24' },
  holePunch: { width: 40, height: 10, borderRadius: 5, border: '1pt solid #cbd5e1', position: 'absolute', top: 15, backgroundColor: '#f8fafc' },

  headerBadge: { width: '100%', height: 100, backgroundColor: '#1e3a8a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 15 },
  headerSantinho: { width: '100%', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1pt solid #1e293b' },

  logoBadge: { height: 30, marginBottom: 5 },
  logoSantinho: { height: 25, marginBottom: 5 },

  schoolNameBadge: { color: '#f8fafc', fontSize: 10, textTransform: 'uppercase', marginTop: 5, textAlign: 'center' },
  schoolNameSantinho: { color: '#94a3b8', fontSize: 7, textTransform: 'uppercase', marginBottom: 2, textAlign: 'center' },

  photoArea: { width: 100, height: 120, border: '1pt dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 20, borderRadius: 8 },
  photoText: { color: '#94a3b8', fontSize: 10 },

  infoAreaBadge: { textAlign: 'center', marginTop: 15, paddingHorizontal: 15, width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  infoAreaSantinho: { padding: 10, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },

  nameBadge: { color: '#0f172a', fontSize: 20, textTransform: 'uppercase', marginBottom: 5, textAlign: 'center' },
  nameSantinho: { color: '#f8fafc', fontSize: 14, textTransform: 'uppercase', marginBottom: 2, textAlign: 'center' },

  roleBadge: { color: '#1e3a8a', fontSize: 14, textTransform: 'uppercase', marginBottom: 15 },
  roleSantinho: { color: '#f8fafc', fontSize: 11, textTransform: 'uppercase' },

  detailsBadge: { display: 'flex', flexDirection: 'column', color: '#64748b', fontSize: 10, marginBottom: 5, textAlign: 'center' },
  detailsSantinho: { color: '#fbbf24', fontSize: 8, backgroundColor: '#1e293b', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, marginTop: 10 },

  numberBadgeBadge: { backgroundColor: '#0f172a', color: '#fbbf24', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, fontSize: 28, marginTop: 'auto', marginBottom: 20 },
  numberBadgeSantinho: { backgroundColor: '#1e293b', color: '#ffffff', border: '1pt solid #fbbf24', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 15, fontSize: 28, marginBottom: 10 },
  
  voteLabel: { fontSize: 6, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 2, textAlign: 'center' }
});

const getTurmaName = (id: string, turmas: any[]) => turmas.find(t => t.id === id)?.name || "Turma Desconhecida";

const CampaignDoc = ({ candidates, isBadge, escolaNome, escolaLogo, turmas }: any) => {
  // Lógica Matemática de Divisão de Folhas
  const qtyPerPage = isBadge ? 4 : 8;
  const itemsToPrint = candidates.length === 1 ? Array(qtyPerPage).fill(candidates[0]) : candidates;
  
  const pages = [];
  for (let i = 0; i < itemsToPrint.length; i += qtyPerPage) {
    pages.push(itemsToPrint.slice(i, i + qtyPerPage));
  }

  return (
    <Document>
      {pages.map((pageCandidates, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation={isBadge ? "portrait" : "landscape"} style={isBadge ? styles.pagePortrait : styles.pageLandscape}>
          {pageCandidates.map((cand: any, idx: number) => {
            const primaryRole = cand.candidate_role ? cand.candidate_role.split(',')[0].trim() : "Candidato";
            return (
              <View key={idx} style={isBadge ? styles.badgeCard : styles.santinhoCard}>
                {isBadge && <View style={styles.holePunch} />}
                {!isBadge && <View style={styles.goldBar} />}
                
                <View style={isBadge ? styles.headerBadge : styles.headerSantinho}>
                  {escolaLogo ? <Image src={escolaLogo} style={isBadge ? styles.logoBadge : styles.logoSantinho} /> : null}
                  <Text style={isBadge ? styles.schoolNameBadge : styles.schoolNameSantinho}>{escolaNome}</Text>
                  {!isBadge && <Text style={styles.roleSantinho}>{primaryRole}</Text>}
                </View>

                {isBadge && (
                  <View style={styles.photoArea}>
                    <Text style={styles.photoText}>3x4 FOTO</Text>
                  </View>
                )}

                <View style={isBadge ? styles.infoAreaBadge : styles.infoAreaSantinho}>
                  <Text style={isBadge ? styles.nameBadge : styles.nameSantinho}>{cand.name || "Candidato"}</Text>
                  {isBadge && <Text style={styles.roleBadge}>{primaryRole}</Text>}
                  
                  <View style={isBadge ? styles.detailsBadge : styles.detailsSantinho}>
                    <Text>Turma: {getTurmaName(cand.turma_id, turmas)}</Text>
                    {isBadge ? <Text>Ano Letivo: {new Date().getFullYear()}</Text> : (cand.vice_name ? <Text>Vice: {cand.vice_name}</Text> : null)}
                  </View>

                  <View style={isBadge ? styles.numberBadgeBadge : styles.numberBadgeSantinho}>
                    {!isBadge && <Text style={styles.voteLabel}>VOTE</Text>}
                    <Text>{cand.candidate_number || "00"}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
};

export const downloadCampaignPDF = async (candidates: any[], isBadge: boolean, escolaNome: string, escolaLogo: string | null, turmas: any[]) => {
  const blob = await pdf(<CampaignDoc candidates={candidates} isBadge={isBadge} escolaNome={escolaNome} escolaLogo={escolaLogo} turmas={turmas} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = isBadge ? `Crachas_Campanha_${new Date().getTime()}.pdf` : `Santinhos_Campanha_${new Date().getTime()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
