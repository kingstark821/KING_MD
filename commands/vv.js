const { bufferFromMessage, findViewOnceMedia } = require('../lib/media');

// ⚠️ Best-effort : la fiabilité dépend de la version de Baileys et du fait que
// WhatsApp livre encore le contenu complet au moment où .vv est tapé (réponds
// à un message vue-unique AVANT qu'il ait déjà été ouvert par quelqu'un).
module.exports = {
    name: 'vv',
    description: 'Renvoie ici le média "vue unique" cité (réponds à un message vue-unique avec .vv)',
    async execute({ sock, m, from }) {
        const media = findViewOnceMedia(m);
        if (!media) {
            return sock.sendMessage(
                from,
                { text: '⚠️ Réponds à un message "vue unique" (photo/vidéo/audio) avec .vv' },
                { quoted: m }
            );
        }

        try {
            const buffer = await bufferFromMessage(media.message, media.type);
            const payload =
                media.type === 'image'
                    ? { image: buffer, caption: media.message.caption || '' }
                    : media.type === 'video'
                    ? { video: buffer, caption: media.message.caption || '' }
                    : { audio: buffer, mimetype: media.message.mimetype || 'audio/mp4' };
            await sock.sendMessage(from, payload, { quoted: m });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Impossible de récupérer ce média : ${error.message}` }, { quoted: m });
        }
    },
};
