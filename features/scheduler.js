const db = require('../db');

async function checkExpiredRoles(client) {
    const now = Date.now();
    const expiredRoles = db.prepare('SELECT * FROM timed_roles WHERE expirationDate <= ?').all(now);

    for (const entry of expiredRoles) {
        const { id, guildId, userId, roleId } = entry;
        try {
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                console.log(`길드를 찾을 수 없습니다: ${guildId}. DB에서 제거합니다.`);
                db.prepare('DELETE FROM timed_roles WHERE id = ?').run(id);
                continue;
            }

            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) {
                console.log(`사용자를 찾을 수 없거나 길드에 없습니다: ${userId} (${guild.name}). DB에서 제거합니다.`);
                db.prepare('DELETE FROM timed_roles WHERE id = ?').run(id);
                continue;
            }

            const role = guild.roles.cache.get(roleId);
            if (!role) {
                console.log(`역할을 찾을 수 없거나 이미 삭제되었습니다: ${roleId} (${guild.name}). DB에서 제거합니다.`);
                db.prepare('DELETE FROM timed_roles WHERE id = ?').run(id);
                continue;
            }

            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
                console.log(`${member.user.tag}님에게서 '${role.name}' 역할이 기간 만료로 제거되었습니다.`);
            } else {
                console.log(`${member.user.tag}님은 이미 '${role.name}' 역할을 가지고 있지 않습니다. DB에서 제거합니다.`);
            }

            db.prepare('DELETE FROM timed_roles WHERE id = ?').run(id);

        } catch (error) {
            console.error(`만료된 역할 처리 중 오류 발생 (guildId: ${guildId}, userId: ${userId}, roleId: ${roleId}):`, error);
            if (error.code === 50013) {
                 console.warn(`[권한 오류] ${guild.name} 서버에서 역할을 제거할 권한이 없습니다. 봇의 역할을 확인해주세요. (ID: ${id})`);
            } else {
            }
        }
    }
}

module.exports = {
    start: (client) => {
        setInterval(() => checkExpiredRoles(client), 60000);
        console.log('기간제 역할 스케줄러가 시작되었습니다.');
    }
};